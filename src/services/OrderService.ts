import { Order } from "../models/Order";
import { OrderItem } from "../models/OrderItem";
import { AppDataSource } from "../config/database";
import * as amqp from "amqplib";

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

    /**
     * Valida se uma mensagem tem o formato esperado
     */
    private validateOrderData(data: any): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        if (!data) {
            return { valid: false, errors: ['Dados de pedido ausentes'] };
        }

        if (typeof data.codigoPedido !== 'number') {
            errors.push('codigoPedido deve ser um número');
        }

        if (typeof data.codigoCliente !== 'number') {
            errors.push('codigoCliente deve ser um número');
        }

        if (!Array.isArray(data.itens) || data.itens.length === 0) {
            errors.push('itens deve ser um array não vazio');
        } else {
            for (let i = 0; i < data.itens.length; i++) {
                const item = data.itens[i];
                if (!item.produto || typeof item.produto !== 'string') {
                    errors.push(`Item #${i+1}: produto deve ser uma string válida`);
                }
                if (typeof item.quantidade !== 'number' || item.quantidade <= 0) {
                    errors.push(`Item #${i+1}: quantidade deve ser um número positivo`);
                }
                if (typeof item.preco !== 'number' || item.preco <= 0) {
                    errors.push(`Item #${i+1}: preco deve ser um número positivo`);
                }
            }
        }

        return { valid: errors.length === 0, errors };
    }

    public async processMessage(message: OrderDTO): Promise<Order> {
        try {
            // Calcula o total do pedido
            const total = message.itens.reduce(
                (sum, item) => sum + (item.quantidade * item.preco),
                0
            );

            // Verificar se o pedido já existe
            const existingOrder = await this.orderRepository.findOne({
                where: { codigoPedido: message.codigoPedido }
            });

            if (existingOrder) {
                console.log(`Pedido ${message.codigoPedido} já existe, atualizando...`);
                
                // Remove itens existentes para substituir com os novos
                await this.orderItemRepository.delete({ codigoPedido: message.codigoPedido });
                
                // Atualiza o pedido
                existingOrder.codigoCliente = message.codigoCliente;
                existingOrder.total = total;
                
                // Cria novos itens
                const orderItems = message.itens.map(item => {
                    const orderItem = new OrderItem();
                    orderItem.codigoPedido = message.codigoPedido;
                    orderItem.produto = item.produto;
                    orderItem.quantidade = item.quantidade;
                    orderItem.preco = item.preco;
                    orderItem.precoTotal = item.quantidade * item.preco;
                    return orderItem;
                });
                
                // Salva os itens
                await this.orderItemRepository.save(orderItems);
                
                // Salva a ordem
                return await this.orderRepository.save(existingOrder);
            } 
            
            // Cria um novo pedido
            const order = new Order();
            order.codigoPedido = message.codigoPedido;
            order.codigoCliente = message.codigoCliente;
            order.total = total;
            
            // Salva primeiro o pedido
            await this.orderRepository.save(order);
            
            // Cria e salva os itens com referência ao codigoPedido
            const orderItems = message.itens.map(item => {
                const orderItem = new OrderItem();
                orderItem.codigoPedido = message.codigoPedido;
                orderItem.produto = item.produto;
                orderItem.quantidade = item.quantidade;
                orderItem.preco = item.preco;
                orderItem.precoTotal = item.quantidade * item.preco;
                return orderItem;
            });
            
            await this.orderItemRepository.save(orderItems);
            
            // Carrega o pedido com itens e retorna
            const savedOrder = await this.orderRepository.findOne({
                where: { codigoPedido: message.codigoPedido },
                relations: ['itens']
            });
            
            if (!savedOrder) {
                throw new Error(`Pedido ${message.codigoPedido} não encontrado após salvar`);
            }
            
            return savedOrder;
        } catch (error) {
            console.error("Erro ao processar mensagem de pedido:", error);
            throw error;
        }
    }

    public async startConsumer(): Promise<void> {
        try {
            console.log("Iniciando consumidor RabbitMQ...");
            const rabbitUri = process.env.RABBITMQ_URI || "amqp://guest:guest@rabbitmq:5672";
            const queueName = process.env.RABBITMQ_QUEUE || "orders";
            const deadLetterQueueName = `${queueName}_dead_letter`;
            
            const connection = await amqp.connect(rabbitUri);
            const channel = await connection.createChannel();
            
            // Configurar a fila de dead letter para mensagens com problemas
            await channel.assertQueue(deadLetterQueueName, { durable: true });
            
            await channel.assertQueue(queueName, { durable: true });
            console.log(`Aguardando mensagens na fila ${queueName}`);
            
            channel.consume(queueName, async (msg) => {
                if (msg) {
                    try {
                        const content = msg.content.toString();
                        console.log(`Mensagem recebida: ${content}`);
                        
                        let data: any;
                        
                        // Tenta fazer o parse do JSON
                        try {
                            data = JSON.parse(content);
                        } catch (jsonError: unknown) {
                            const errorMessage = jsonError instanceof Error ? jsonError.message : 'Erro desconhecido';
                            console.error(`Erro ao fazer parse do JSON: ${errorMessage}`);
                            // Envia para a fila de dead letter por ser um JSON inválido
                            channel.sendToQueue(deadLetterQueueName, msg.content, {
                                headers: {
                                    'x-error': 'JSON inválido',
                                    'x-original-message': content
                                }
                            });
                            channel.ack(msg); // Confirma a mensagem original
                            return;
                        }
                        
                        // Valida o formato da mensagem
                        const validation = this.validateOrderData(data);
                        
                        if (!validation.valid) {
                            console.error(`Mensagem com formato inválido: ${validation.errors.join(', ')}`);
                            
                            // Verifica se a mensagem já foi reprocessada muitas vezes
                            const retryCount = msg.properties.headers?.['x-retry-count'] || 0;
                            
                            if (retryCount >= this.MAX_RETRIES) {
                                // Enviar para dead letter após várias tentativas
                                channel.sendToQueue(deadLetterQueueName, msg.content, {
                                    headers: {
                                        'x-error': validation.errors.join('; '),
                                        'x-retry-count': retryCount,
                                        'x-original-message': content
                                    }
                                });
                                channel.ack(msg); // Confirma a mensagem original
                            } else {
                                // Rejeita a mensagem e recoloca na fila para reprocessamento
                                channel.nack(msg, false, true);
                                console.log(`Tentativa ${retryCount + 1}/${this.MAX_RETRIES}`);
                            }
                            return;
                        }
                        
                        // Converte para o tipo esperado após validação bem-sucedida
                        const orderData = data as OrderDTO;
                        await this.processMessage(orderData);
                        
                        channel.ack(msg);
                        console.log("Mensagem processada com sucesso");
                    } catch (error) {
                        console.error("Erro ao processar mensagem:", error);
                        
                        // Verifica número de tentativas
                        const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) + 1;
                        
                        if (retryCount > this.MAX_RETRIES) {
                            // Enviar para dead letter após várias tentativas
                            channel.sendToQueue(deadLetterQueueName, msg.content, {
                                headers: {
                                    'x-error': error instanceof Error ? error.message : 'Erro desconhecido',
                                    'x-retry-count': retryCount,
                                    'x-original-message': msg.content.toString()
                                }
                            });
                            channel.ack(msg); // Confirma a mensagem original
                            console.log(`Mensagem movida para fila de dead letter após ${retryCount} tentativas`);
                        } else {
                            // Recolocar na fila para reprocessamento
                            channel.nack(msg, false, true);
                            console.log(`Tentativa ${retryCount}/${this.MAX_RETRIES}`);
                        }
                    }
                }
            });

            process.on("SIGINT", async () => {
                await channel.close();
                await connection.close();
                process.exit(0);
            });
            
        } catch (error) {
            console.error("Erro ao iniciar consumidor RabbitMQ:", error);

            setTimeout(() => this.startConsumer(), 5000);
        }
    }
}
