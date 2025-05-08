import "reflect-metadata"
import express from 'express'
import cors from 'cors'
import ordersRouter from './routes/orders';
import { AppDataSource } from "./config/database";
import { OrderService } from "./services/OrderService";

const app = express()

app.use(cors())
app.use(express.json())

AppDataSource.initialize()
    .then(async () => {
        console.log("Banco de dados conectado com sucesso");

        app.use('/api/orders', ordersRouter);

        app.get('/', (req, res) => {
            res.json({
                message: 'API de processamento de pedidos',
                endpoints: {
                    customers: '/api/customers',
                    orders: '/api/orders',
                    ordersByCustomer: '/api/orders/customer/:customerId',
                    orderCount: '/api/orders/stats/count',
                    orderTotal: '/api/orders/:id/total'
                }
            });
        });


        const orderService = new OrderService();
        orderService.startConsumer()
            .then(() => console.log("Consumidor RabbitMQ iniciado com sucesso"))
            .catch(error => console.error("Erro ao iniciar consumidor RabbitMQ:", error));


        app.listen(3333, () => {
            console.log('Servidor rodando na porta 3333');
        });
    })
    .catch(error => {
        console.error("Erro ao conectar com o banco:", error);
    });