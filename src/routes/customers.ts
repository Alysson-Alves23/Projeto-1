// src/routes/customer.routes.ts
import { Router } from 'express';
import { CustomerController } from '../controllers/CustomerController';

const router = Router();
const customerController = new CustomerController();

router.get('/', customerController.listCustomers);
router.get('/:id', customerController.getCustomerDetails);
router.get('/:id/orders', customerController.getCustomerOrders);

export default router;