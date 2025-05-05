// Order.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Customer } from "./Customer";

@Entity()
export class Order {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    codigoPedido: number;

    @Column("decimal", { precision: 10, scale: 2 })
    total: number;

    @ManyToOne(() => Customer, c => c.orders)
    customer: Customer;
}
