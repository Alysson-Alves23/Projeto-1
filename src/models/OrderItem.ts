import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Order } from "./Order";

@Entity('order_item')  // Especifica o nome explícito da tabela
export class OrderItem {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    produto: string;

    @Column()
    quantidade: number;

    @Column("decimal", { precision: 10, scale: 2 })
    preco: number;

    @Column("decimal", { precision: 10, scale: 2 })
    precoTotal: number;

    @ManyToOne(() => Order, order => order.itens)
    order: Order;
}
