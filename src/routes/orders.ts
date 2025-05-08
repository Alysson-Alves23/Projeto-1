import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';

const router = Router();
const orderController = new OrderController();

router.get('/', orderController.listOrders);
router.get('/:id', orderController.getOrderDetails);
router.get('/:id/total', orderController.getTotalOrderValue);
router.get('/customer/:customerId', orderController.getOrdersByCustomer);
router.get('/stats/count', orderController.getOrderCount);

export default router;
