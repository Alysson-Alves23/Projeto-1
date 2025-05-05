import "reflect-metadata"
import express from 'express'
import customersRouter from './routes/customers';
import {AppDataSource} from "./config/database";
const app = express()


app.use(express.json())

AppDataSource.initialize().then(() => "connected to database").catch(e => `error connecting to database:${e}`);


app.use('/api/customers', customersRouter)


app.listen(3333, () => 'server running on port 3333')

