import { DataSource } from "typeorm";
import { Order } from "../models/Order";
import { Customer } from "../models/Customer";
import { OrderItem } from "../models/OrderItem";

console.log('=== Configurações de Conexão ===');
console.log('Host:', process.env.MYSQL_HOST);
console.log('Porta:', process.env.MYSQL_PORT);
console.log('Usuário:', process.env.MYSQL_USER);
console.log('Banco:', process.env.MYSQL_DATABASE);
console.log('===========================');

export const AppDataSource = new DataSource({
    type: "mysql",
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT) || 3306,
    username: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "password",
    database: process.env.MYSQL_DATABASE || "orders",
    entities: [Customer, Order, OrderItem],
    migrations: ["dist/database/migrations/*.js"],
    synchronize: false,
});

