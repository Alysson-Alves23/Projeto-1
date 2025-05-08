import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Order } from '../models/Order';
import { Customer } from '../models/Customer';

export class OrderController {
    private orderRepository = AppDataSource.getRepository(Order);
    private customerRepository = AppDataSource.getRepository(Customer);

    public listOrders = async (req: Request, res: Response): Promise<void> => {
        try {
            const orders = await this.orderRepository.find({
                relations: ['itens']
            });
            res.json(orders);
        } catch (error) {
            res.status(500).json({
                message: 'Erro ao buscar a lista de pedidos',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    public getOrderDetails = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const order = await this.orderRepository.findOne({
                where: { id: Number(id) },
                relations: ['itens', 'customer']
            });

            if (!order) {
                res.status(404).json({ message: 'Pedido não encontrado' });
                return;
            }

            res.json(order);
        } catch (error) {
            res.status(500).json({
                message: 'Erro ao buscar detalhes do pedido',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    public getOrdersByCustomer = async (req: Request, res: Response): Promise<void> => {
        try {
            const { customerId } = req.params;
            const orders = await this.orderRepository.find({
                where: { customer: { id: Number(customerId) } },
                relations: ['itens']
            });

            res.json(orders);
        } catch (error) {
            res.status(500).json({
                message: 'Erro ao buscar pedidos do cliente',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    public getOrderCount = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.orderRepository
                .createQueryBuilder('order')
                .select('order.codigoCliente', 'codigoCliente')
                .addSelect('COUNT(order.id)', 'quantidade')
                .groupBy('order.codigoCliente')
                .getRawMany();

            res.json(result);
        } catch (error) {
            res.status(500).json({
                message: 'Erro ao buscar contagem de pedidos por cliente',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    public getTotalOrderValue = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const order = await this.orderRepository.findOne({
                where: { id: Number(id) }
            });

            if (!order) {
                res.status(404).json({ message: 'Pedido não encontrado' });
                return;
            }

            res.json({ pedido: order.codigoPedido, total: order.total });
        } catch (error) {
            res.status(500).json({
                message: 'Erro ao buscar valor total do pedido',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
}
