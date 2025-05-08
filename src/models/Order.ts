import { Entity, PrimaryColumn, Column, OneToMany} from "typeorm";
import { OrderItem } from "./OrderItem";


@Entity('orders')
export class Order {
    @PrimaryColumn()
    codigoPedido: number;

    @Column()
    codigoCliente: number;

    @Column("decimal", { precision: 10, scale: 2 })
    total: number;

    @OneToMany(() => OrderItem, item => item.order, { cascade: true })
    itens: OrderItem[];

}
