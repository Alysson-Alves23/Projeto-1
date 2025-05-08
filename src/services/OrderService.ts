import { Customer } from "../models/Customer";
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
    private customerRepository = AppDataSource.getRepository(Customer);
    private orderRepository = AppDataSource.getRepository(Order);

    public async processMessage(message: OrderDTO): Promise<Order> {
        try {

            let customer = await this.customerRepository.findOne({
                where: { id: message.codigoCliente }
            });

            if (!customer) {
                customer = new Customer();
                customer.id = message.codigoCliente;
                customer.name = `Cliente ${message.codigoCliente}`;
                await this.customerRepository.save(customer);
            }


            const total = message.itens.reduce(
                (sum, item) => sum + (item.quantidade * item.preco),
                0
            );


            const order = new Order();
            order.codigoPedido = message.codigoPedido;
            order.codigoCliente = message.codigoCliente;
            order.total = total;
            order.customer = customer;

            order.itens = message.itens.map(item => {
                const orderItem = new OrderItem();
                orderItem.produto = item.produto;
                orderItem.quantidade = item.quantidade;
                orderItem.preco = item.preco;
                orderItem.precoTotal = item.quantidade * item.preco;
                return orderItem;
            });

            return await this.orderRepository.save(order);
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
            
            const connection = await amqp.connect(rabbitUri);
            const channel = await connection.createChannel();
            
            await channel.assertQueue(queueName, { durable: true });
            console.log(`Aguardando mensagens na fila ${queueName}`);
            
            channel.consume(queueName, async (msg) => {
                if (msg) {
                    try {
                        const content = msg.content.toString();
                        console.log(`Mensagem recebida: ${content}`);
                        
                        const orderData: OrderDTO = JSON.parse(content);
                        await this.processMessage(orderData);
                        
                        channel.ack(msg);
                        console.log("Mensagem processada com sucesso");
                    } catch (error) {
                        console.error("Erro ao processar mensagem:", error);
                        // Não confirma a mensagem para que ela seja reprocessada
                        channel.nack(msg);
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
