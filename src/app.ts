import express from 'express'
import customersRouter from './routes/customers';
const app = express()


app.use(express.json())



app.use('/api/customers', customersRouter)


app.listen(3333, () => 'server running on port 3333')

