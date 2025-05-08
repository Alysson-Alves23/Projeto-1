// Order.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from "typeorm";
import { Customer } from "./Customer";
import { OrderItem } from "./OrderItem";

@Entity('orders')  // Especifica o nome explícito da tabela
export class Order {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    codigoPedido: number;

    @Column()
    codigoCliente: number;

    @Column("decimal", { precision: 10, scale: 2 })
    total: number;

    @ManyToOne(() => Customer, c => c.orders)
    customer: Customer;

    @OneToMany(() => OrderItem, item => item.order, { cascade: true })
    itens: OrderItem[];
}
