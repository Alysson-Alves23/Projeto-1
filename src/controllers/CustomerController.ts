// src/controllers/CustomerController.ts
import { Request, Response } from 'express';

export class CustomerController {
    public async listCustomers(req: Request, res: Response): Promise<void> {
        res.json({ message: 'Customer list' });
    }

    public async getCustomerDetails(req: Request, res: Response): Promise<void> {
        res.json({ message: 'Customer details' });
    }

    public async getCustomerOrders(req: Request, res: Response): Promise<void> {
        res.json({ message: 'Customer list' });
    }
}