import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Order } from "./Order";

@Entity('order_item')
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

    @Column({ name: "codigoPedido" })
    codigoPedido: number;

    @ManyToOne(() => Order, order => order.itens)
    @JoinColumn({ name: "codigoPedido", referencedColumnName: "codigoPedido" })
    order: Order;
}
