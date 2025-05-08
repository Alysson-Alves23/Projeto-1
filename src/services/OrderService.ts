import { Order } from "../models/Order";
import { OrderItem } from "../models/OrderItem";
import { AppDataSource } from "../config/database";
import * as amqplib from "amqplib";

// Correção de tipos para amqplib para resolver erros TS2739 e TS2339
type AmqplibConnection = ReturnType<typeof amqplib.connect> extends Promise<infer T> ? T : never;
type AmqplibChannel = ReturnType<AmqplibConnection['createChannel']> extends Promise<infer T> ? T : never;

interface OrderItemDTO {
    produto: string;
    quantidade: number;
    preco: number;
}

interface OrderDTO {
    codigoPedido: number;
    codigoCliente: number;
    itens: OrderItemDTO[];
}

export class OrderService {
    private orderRepository = AppDataSource.getRepository(Order);
    private orderItemRepository = AppDataSource.getRepository(OrderItem);
    private MAX_RETRIES = 3;
    private connection: AmqplibConnection | null = null;
    private channel: AmqplibChannel | null = null;

    /**
     * Valida se uma mensagem tem o formato esperado
     */
    private validateOrderData(data: any): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        if (!data) {
            return { valid: false, errors: ['Dados de pedido ausentes'] };
        }

        console.log("Validando dados de pedido:", JSON.stringify(data, null, 2));
        
        // Verifica se codigoPedido pode ser convertido para número
        if (data.codigoPedido === undefined) {
            errors.push('codigoPedido está ausente');
        } else if (isNaN(Number(data.codigoPedido))) {
            errors.push(`codigoPedido deve ser um número válido, recebido: ${typeof data.codigoPedido} = ${data.codigoPedido}`);
        }
    
        // Verifica se codigoCliente pode ser convertido para número
        if (data.codigoCliente === undefined) {
            errors.push('codigoCliente está ausente');
        } else if (isNaN(Number(data.codigoCliente))) {
            errors.push(`codigoCliente deve ser um número válido, recebido: ${typeof data.codigoCliente} = ${data.codigoCliente}`);
        }
    
        if (!data.itens) {
            errors.push('itens está ausente');
        } else if (!Array.isArray(data.itens)) {
            errors.push(`itens deve ser um array, recebido: ${typeof data.itens}`);
        } else if (data.itens.length === 0) {
            errors.push('itens deve ser um array não vazio');
        } else {
            for (let i = 0; i < data.itens.length; i++) {
                const item = data.itens[i];
                
                if (!item) {
                    errors.push(`Item #${i+1}: item está nulo ou indefinido`);
                    continue;
                }
                
                // Verifica se produto existe e é uma string
                if (item.produto === undefined) {
                    errors.push(`Item #${i+1}: produto está ausente`);
                } else if (typeof item.produto !== 'string') {
                    errors.push(`Item #${i+1}: produto deve ser uma string, recebido: ${typeof item.produto}`);
                } else if (item.produto.trim() === '') {
                    errors.push(`Item #${i+1}: produto não pode ser uma string vazia`);
                }
                
                // Verifica se quantidade pode ser convertida para número e é positiva
                if (item.quantidade === undefined) {
                    errors.push(`Item #${i+1}: quantidade está ausente`);
                } else {
                    const quantidade = Number(item.quantidade);
                    if (isNaN(quantidade)) {
                        errors.push(`Item #${i+1}: quantidade deve ser um número, recebido: ${typeof item.quantidade} = ${item.quantidade}`);
                    } else if (quantidade <= 0) {
                        errors.push(`Item #${i+1}: quantidade deve ser um número positivo, recebido: ${quantidade}`);
                    }
                }
                
                // Verifica se preco pode ser convertido para número e é positivo
                if (item.preco === undefined) {
                    errors.push(`Item #${i+1}: preco está ausente`);
                } else {
                    const preco = Number(item.preco);
                    if (isNaN(preco)) {
                        errors.push(`Item #${i+1}: preco deve ser um número, recebido: ${typeof item.preco} = ${item.preco}`);
                    } else if (preco <= 0) {
                        errors.push(`Item #${i+1}: preco deve ser um número positivo, recebido: ${preco}`);
                    } else {
                        // Verifica se o valor de preço está dentro dos limites suportados pelo tipo decimal(10,2)
                        const MAX_DECIMAL_VALUE = 99999999.99;
                        if (preco > MAX_DECIMAL_VALUE) {
                            errors.push(`Item #${i+1}: preco excede o valor máximo suportado (${MAX_DECIMAL_VALUE})`);
                        }
                        
                        // Verifica se o preço tem mais de 2 casas decimais (que pode causar problemas)
                        const precoStr = preco.toString();
                        if (precoStr.includes('.') && precoStr.split('.')[1].length > 2) {
                            console.warn(`Item #${i+1}: preco tem mais de 2 casas decimais e será arredondado: ${preco}`);
                        }
                    }
                }
            }
        }
    
        if (errors.length > 0) {
            console.error("Erros de validação:", errors);
        } else {
            console.log("Dados de pedido válidos!");
        }

        return { valid: errors.length === 0, errors };
    }

    public async processMessage(message: OrderDTO): Promise<Order> {
        try {
            // Log para diagnóstico - com controle para evitar logs muito grandes
            // Usando somente campos essenciais para debug
            console.log(`Processando pedido: código ${message.codigoPedido}, cliente ${message.codigoCliente}, ${message.itens?.length || 0} itens`);
            console.log(`Conteúdo da mensagem: ${JSON.stringify(message, null, 2)}`);
            
            // Verificações defensivas antes de qualquer processamento
            if (!message) {
                throw new Error("Mensagem de pedido está vazia");
            }
    
            if (!message.itens || !Array.isArray(message.itens)) {
                throw new Error("Itens do pedido ausentes ou em formato inválido");
            }
            
            // Garantir que todos os valores numéricos estão no formato correto
            // Com validações adicionais em cada conversão
            const safeMessage: OrderDTO = {
                codigoPedido: Number.isNaN(Number(message.codigoPedido)) 
                    ? (console.error(`Código de pedido inválido: ${message.codigoPedido}`), 0) 
                    : Number(message.codigoPedido),
                    
                codigoCliente: Number.isNaN(Number(message.codigoCliente)) 
                    ? (console.error(`Código de cliente inválido: ${message.codigoCliente}`), 0) 
                    : Number(message.codigoCliente),
                    
                itens: message.itens.map((item, index) => {
                    // Verificação item a item para garantir valores corretos
                    const quantidade = Number(item.quantidade);
                    const preco = Number(Number(item.preco).toFixed(2));
                    
                    if (Number.isNaN(quantidade)) {
                        console.warn(`Item #${index}: quantidade inválida "${item.quantidade}", usando 0`);
                    }
                    
                    if (Number.isNaN(preco)) {
                        console.warn(`Item #${index}: preço inválido "${item.preco}", usando 0`);
                    }
                    
                    return {
                        produto: String(item.produto || ''),
                        quantidade: Number.isNaN(quantidade) ? 0 : quantidade,
                        preco: Number.isNaN(preco) ? 0 : preco
                    };
                })
            };
            
            // Verificações de integridade após conversão
            if (safeMessage.codigoPedido <= 0) {
                throw new Error(`Código de pedido inválido ou não positivo: ${safeMessage.codigoPedido}`);
            }
            
            if (safeMessage.codigoCliente <= 0) {
                throw new Error(`Código de cliente inválido ou não positivo: ${safeMessage.codigoCliente}`);
            }
            
            if (safeMessage.itens.length === 0) {
                throw new Error("Pedido não possui itens");
            }
    
            // Calcula o total do pedido com precisão de 2 casas decimais
            const total = Number(
                safeMessage.itens.reduce(
                    (sum, item) => sum + (item.quantidade * item.preco),
                    0
                ).toFixed(2)
            );
    
            // Processo em transação para garantir atomicidade
            return await AppDataSource.transaction(async transactionalEntityManager => {
                try {
                    // Verificar se o pedido já existe
                    const existingOrder = await transactionalEntityManager.findOne(Order, {
                        where: { codigoPedido: safeMessage.codigoPedido }
                    });
        
                    if (existingOrder) {
                        console.log(`Pedido ${safeMessage.codigoPedido} já existe, atualizando...`);
                        
                        // Remove itens existentes para substituir com os novos - dentro da transação
                        await transactionalEntityManager.createQueryBuilder()
                            .delete()
                            .from(OrderItem)
                            .where("codigoPedido = :codigoPedido", { codigoPedido: safeMessage.codigoPedido })
                            .execute();


                        // Atualiza o pedido
                        existingOrder.codigoCliente = safeMessage.codigoCliente;
                        existingOrder.total = total;
                        
                        // Cria novos itens
                        const orderItems = safeMessage.itens.map(item => {
                            const orderItem = new OrderItem();
                            orderItem.codigoPedido = safeMessage.codigoPedido;
                            orderItem.produto = item.produto;
                            orderItem.quantidade = item.quantidade;
                            orderItem.preco = item.preco;
                            orderItem.precoTotal = Number((item.quantidade * item.preco).toFixed(2));
                            return orderItem;
                        });
                        
                        // Salva os itens - dentro da transação
                        await transactionalEntityManager.save(OrderItem, orderItems);
                            
                        // Salva a ordem - dentro da transação 
                        await transactionalEntityManager.save(Order, existingOrder);
                        
                        console.log(`Pedido ${safeMessage.codigoPedido} atualizado com sucesso`);
                        return existingOrder;
                    } 
                    
                    console.log(`Criando novo pedido ${safeMessage.codigoPedido}`);
                    
                    // Cria um novo pedido
                    const order = new Order();
                    order.codigoPedido = safeMessage.codigoPedido;
                    order.codigoCliente = safeMessage.codigoCliente;
                    order.total = total;
                    
                    // Salva primeiro o pedido - dentro da transação
                    await transactionalEntityManager.save(Order, order);
                    
                    // Cria e salva os itens com referência ao codigoPedido
                    const orderItems = safeMessage.itens.map(item => {
                        const orderItem = new OrderItem();
                        orderItem.codigoPedido = safeMessage.codigoPedido;
                        orderItem.produto = item.produto;
                        orderItem.quantidade = item.quantidade;
                        orderItem.preco = item.preco;
                        orderItem.precoTotal = Number((item.quantidade * item.preco).toFixed(2));
                        return orderItem;
                    });
                    
                    // Salva os itens - dentro da transação
                    await transactionalEntityManager.save(OrderItem, orderItems);
                    
                    console.log(`Pedido ${safeMessage.codigoPedido} criado com sucesso`);
                    return order;
                } catch (dbError: any) {
                    // Já está em uma transação, então qualquer erro causará rollback
                    console.error(`[TRANSAÇÃO] Erro de banco de dados ao processar pedido ${safeMessage.codigoPedido}:`, dbError);
                    throw new Error(`Erro de banco de dados: ${dbError.message || 'Erro desconhecido'}`);
                }
            });
        } catch (error: unknown) {
            console.error("Erro ao processar mensagem de pedido:", error instanceof Error ? error.message : 'Erro desconhecido');
            throw error;
        }
    }

    public async startConsumer(): Promise<void> {
        try {
            console.log("Iniciando consumidor RabbitMQ...");
            const rabbitUri = process.env.RABBITMQ_URI || "amqp://guest:guest@rabbitmq:5672";
            const queueName = process.env.RABBITMQ_QUEUE || "orders";
            const deadLetterQueueName = `${queueName}_dead_letter`;
            
            let connection: AmqplibConnection | null = null;
            let channel: AmqplibChannel | null = null;
            
            try {
                // Estabelece conexão com RabbitMQ
                try {
                    connection = await amqplib.connect(rabbitUri);
                    
                    if (!connection) {
                        throw new Error("Falha ao conectar ao RabbitMQ: conexão não estabelecida");
                    }
                    
                    this.connection = connection;
                } catch (connectionError) {
                    console.error('Erro ao estabelecer conexão com RabbitMQ:', connectionError);
                    setTimeout(() => this.startConsumer(), 5000);
                    return;
                }
                
                // Tratar desconexões do RabbitMQ
                connection.on('error', (err) => {
                    console.error('Erro na conexão RabbitMQ:', err);
                    this.connection = null;
                    setTimeout(() => this.startConsumer(), 5000);
                });
                
                connection.on('close', () => {
                    console.log('Conexão RabbitMQ fechada, tentando reconectar...');
                    this.connection = null;
                    setTimeout(() => this.startConsumer(), 5000);
                });
                
                // Cria canal de comunicação
                if (!connection) {
                    throw new Error("Conexão não está disponível para criar canal");
                }
                
                channel = await connection.createChannel();
                
                if (!channel) {
                    throw new Error("Falha ao criar canal RabbitMQ");
                }
                
                this.channel = channel;
                
                // Configurar a fila de dead letter para mensagens com problemas
                await channel.assertQueue(deadLetterQueueName, { durable: true });
                await channel.assertQueue(queueName, { durable: true });
                
                console.log(`Aguardando mensagens na fila ${queueName}`);
                
                if (!channel) {
                    throw new Error("Canal não está disponível para consumir mensagens");
                }
                
                channel.consume(queueName, async (msg) => {
                    if (!msg) return;
                    if (!channel) {
                        console.error("Canal não está disponível durante o processamento da mensagem");
                        return;
                    }
                    
                    let content = '';
                    
                    try {
                        content = msg.content.toString();
                        console.log(`Mensagem recebida: ${content}`);
                        
                        let data: any;
                        
                        // Tenta fazer o parse do JSON
                        try {
                            data = JSON.parse(content);
                        } catch (jsonError) {
                            console.error(`Erro ao fazer parse do JSON: ${jsonError instanceof Error ? jsonError.message : 'Erro desconhecido'}`);
                            // Envia para a fila de dead letter por ser um JSON inválido
                            if (channel) {
                                channel.sendToQueue(deadLetterQueueName, msg.content, {
                                    headers: {
                                        'x-error': 'JSON inválido',
                                        'x-original-message': content
                                    }
                                });
                                channel.ack(msg); // Confirma a mensagem original
                            }
                            return;
                        }
                        
                        // Valida o formato da mensagem
                        const validation = this.validateOrderData(data);
                        
                        if (!validation.valid) {
                            console.error(`Mensagem com formato inválido: ${validation.errors.join(', ')}`);
                            
                            // Obter cabeçalhos de forma segura
                            const headers = msg.properties.headers || {};
                            const retryCount = (headers['x-retry-count'] as number) || 0;
                            
                            if (retryCount >= this.MAX_RETRIES) {
                                // Enviar para dead letter após várias tentativas
                                if (channel) {
                                    channel.sendToQueue(deadLetterQueueName, msg.content, {
                                        headers: {
                                            'x-error': validation.errors.join('; '),
                                            'x-retry-count': retryCount,
                                            'x-original-message': content
                                        }
                                    });
                                    channel.ack(msg); // Confirma a mensagem original
                                }
                            } else {
                                // Recoloca na fila para reprocessamento com incremento no contador
                                if (channel) {
                                    channel.sendToQueue(queueName, msg.content, {
                                        headers: {
                                            ...headers,
                                            'x-retry-count': retryCount + 1
                                        }
                                    });
                                    channel.ack(msg); // Ack a mensagem original após recolocá-la
                                    console.log(`Tentativa ${retryCount + 1}/${this.MAX_RETRIES}`);
                                }
                            }
                            return;
                        }
                        
                        // Converte para o tipo esperado após validação bem-sucedida
                        const orderData = data as OrderDTO;
                        
                        try {
                            await this.processMessage(orderData);
                            if (channel) {
                                channel.ack(msg);
                                console.log("Mensagem processada com sucesso");
                            }
                        } catch (processError) {
                            console.error("Erro ao processar mensagem:", processError);
                            
                            // Obter cabeçalhos de forma segura
                            const headers = msg.properties.headers || {};
                            const retryCount = (headers['x-retry-count'] as number) || 0;
                            
                            if (retryCount >= this.MAX_RETRIES) {
                                // Enviar para dead letter após várias tentativas
                                if (channel) {
                                    channel.sendToQueue(deadLetterQueueName, msg.content, {
                                        headers: {
                                            'x-error': processError instanceof Error ? processError.message : 'Erro desconhecido',
                                            'x-retry-count': retryCount,
                                            'x-original-message': content
                                        }
                                    });
                                    channel.ack(msg); // Confirma a mensagem original
                                }
                                console.log(`Mensagem movida para fila de dead letter após ${retryCount} tentativas`);
                            } else {
                                // Recoloca na fila para reprocessamento com incremento no contador
                                if (channel) {
                                    channel.sendToQueue(queueName, msg.content, {
                                        headers: {
                                            ...headers,
                                            'x-retry-count': retryCount + 1
                                        }
                                    });
                                    channel.ack(msg); // Ack a mensagem original após recolocá-la
                                    console.log(`Tentativa ${retryCount + 1}/${this.MAX_RETRIES}`);
                                } else {
                                    console.error('Canal não disponível para reprocessamento');
                                }
                            }
                        }
                    } catch (error) {
                        console.error("Erro crítico ao processar mensagem:", error);
                        
                        try {
                            // Tenta mover a mensagem para dead letter em caso de erro crítico não tratado
                            if (channel) {
                                channel.sendToQueue(deadLetterQueueName, msg.content, {
                                    headers: {
                                        'x-error': 'Erro crítico: ' + (error instanceof Error ? error.message : 'Erro desconhecido'),
                                        'x-original-message': content
                                    }
                                });
                                channel.ack(msg); // Confirma mesmo em caso de erro para não bloquear
                            }
                        } catch (dlqError) {
                            console.error("Erro ao mover mensagem para dead letter:", dlqError);
                            // Último recurso - ack a mensagem para não bloquear a fila
                            try {
                                if (channel) {
                                    channel.ack(msg);
                                }
                            } catch (ackError) {
                                console.error("Falha no ACK da mensagem:", ackError);
                            }
                        }
                    }
                });
    
                // Manipuladores de processo para encerramento gracioso
                const gracefulShutdown = async () => {
                    console.log('Encerrando conexão com RabbitMQ...');
                    
                    try {
                        if (channel) {
                            await channel.close();
                            console.log('Canal fechado com sucesso');
                        }
                    } catch (err) {
                        console.error('Erro ao fechar canal:', err);
                    }
                    
                    try {
                        if (connection) {
                            await connection.close();
                            console.log('Conexão fechada com sucesso');
                        }
                    } catch (err) {
                        console.error('Erro ao fechar conexão:', err);
                    }
                    
                    this.channel = null;
                    this.connection = null;
                    process.exit(0);
                };
    
                process.on("SIGINT", gracefulShutdown);
                process.on("SIGTERM", gracefulShutdown);
                
            } catch (initError) {
                console.error("Erro ao inicializar canal RabbitMQ:", initError);
                
                // Fechar recursos em caso de erro
                if (channel) await channel.close().catch(console.error);
                if (connection) await connection.close().catch(console.error);
                this.channel = null;
                this.connection = null;
                
                // Tentar reconectar
                setTimeout(() => this.startConsumer(), 5000);
            }
            
        } catch (error) {
            console.error("Erro ao iniciar consumidor RabbitMQ:", error);
            // Tentar reconectar após erro
            setTimeout(() => this.startConsumer(), 5000);
        }
    }
}
