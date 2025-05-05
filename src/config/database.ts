import { DataSource } from "typeorm";
import { Order } from "../models/Order";
import { Customer } from "../models/Customer";

export const AppDataSource = new DataSource({
    type: "mysql",
    host: process.env.MYSQL_HOST || "mysql",
    port: Number(process.env.MYSQL_PORT) || 3306,
    username: process.env.MYSQL_USER || "user",
    password: process.env.MYSQL_PASSWORD || "password",
    database: process.env.MYSQL_DATABASE || "orders_db",
    entities: [Customer, Order],
    migrations: ["dist/db/migrations/*.js"],
    synchronize: false,
});
