import { Router } from 'express';

const router = Router();


router.get('/', (req, res) => {
    res.json({message: 'Customer list'});
});


router.get('/:id/', (req, res) => {
    res.json({message: 'Customer details '});
});

router.get('/:id/orders', (req, res) => {
    res.json({message: 'Customer orders list'});
});

export default router;