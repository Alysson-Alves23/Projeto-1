import { Seeder } from "./Seeder";
import { Order } from "../../models/Order";
import { OrderItem } from "../../models/OrderItem";
import { DataSource } from "typeorm";

export class OrderSeeder extends Seeder {
    constructor(dataSource: DataSource) {
        super(dataSource);
    }

    async run(): Promise<void> {
        try {
            // Verificar se as tabelas existem
            const queryRunner = this.dataSource.createQueryRunner();
            const ordersTableExists = await queryRunner.hasTable('orders');
            const orderItemTableExists = await queryRunner.hasTable('order_item');
            await queryRunner.release();
            
            if (!ordersTableExists || !orderItemTableExists) {
                console.log("Tabelas necessárias não existem. Execute as migrations primeiro.");
                return;
            }
            
            const orderRepository = this.dataSource.getRepository(Order);
            const orderItemRepository = this.dataSource.getRepository(OrderItem);
            
            const count = await orderRepository.count();
            if (count > 0) {
                console.log('Pedidos já existem na base de dados. Pulando seeding...');
                return;
            }

            const produtos = [
                { nome: "Lápis", preco: 1.10 },
                { nome: "Caderno", preco: 15.00 },
                { nome: "Borracha", preco: 0.50 },
                { nome: "Caneta", preco: 2.30 },
                { nome: "Régua", preco: 1.80 },
                { nome: "Mochila", preco: 89.90 },
                { nome: "Estojo", preco: 12.50 },
                { nome: "Calculadora", preco: 25.90 },
                { nome: "Tesoura", preco: 3.70 },
                { nome: "Cola", preco: 4.20 }
            ];

            // Criar 10 pedidos com itens variados
            const pedidos = [];
            let itemIdCounter = 1; // Contador para IDs dos itens
            
            for (let i = 1; i <= 10; i++) {
                // Gerar um código de cliente aleatório entre 1 e 5
                const codigoCliente = Math.floor(Math.random() * 5) + 1;
                
                // Criar entre 1 e 5 itens para o pedido
                const numItens = Math.floor(Math.random() * 5) + 1;
                const itens: OrderItem[] = [];
                let total = 0;
                
                for (let j = 0; j < numItens; j++) {
                    // Selecionar um produto aleatoriamente
                    const produtoIndex = Math.floor(Math.random() * produtos.length);
                    const produto = produtos[produtoIndex];
                    
                    // Quantidade entre 1 e 20
                    const quantidade = Math.floor(Math.random() * 20) + 1;
                    const precoTotal = produto.preco * quantidade;
                    total += precoTotal;
                    
                    const orderItem = orderItemRepository.create({
                        id: itemIdCounter++, // Definir ID manualmente
                        produto: produto.nome,
                        quantidade: quantidade,
                        preco: produto.preco,
                        precoTotal: precoTotal
                    });
                    
                    itens.push(orderItem);
                }
                
                const order = orderRepository.create({
                    codigoPedido: 1000 + i,
                    codigoCliente: codigoCliente,
                    total: total,
                    itens: itens
                });
                
                pedidos.push(order);
            }
            
            // Salvar todos os pedidos
            await orderRepository.save(pedidos);
            console.log(`${pedidos.length} pedidos com seus itens foram inseridos.`);
        } catch (error) {
            console.error("Erro no OrderSeeder:", error);
            throw error;
        }
    }
}
