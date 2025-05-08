import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateOrderItemsTable1746660800224 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Verificar se a tabela já existe antes de criar
        const tableExists = await queryRunner.hasTable("order_item");
        if (tableExists) {
            console.log("Tabela 'order_item' já existe, pulando criação");
            return;
        }
        
        await queryRunner.createTable(
            new Table({
                name: "order_item",
                columns: [
                    {
                        name: "id",
                        type: "int",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment"
                    },
                    {
                        name: "produto",
                        type: "varchar",
                        length: "255"
                    },
                    {
                        name: "quantidade",
                        type: "int"
                    },
                    {
                        name: "preco",
                        type: "decimal",
                        precision: 10,
                        scale: 2
                    },
                    {
                        name: "precoTotal",
                        type: "decimal",
                        precision: 10,
                        scale: 2
                    },
                    {
                        name: "codigoPedido",
                        type: "int",
                        isNullable: true
                    }
                ]
            })
        );

        // Verifica se a tabela orders existe antes de criar a foreign key
        const ordersTableExists = await queryRunner.hasTable("orders");
        if (ordersTableExists) {
            await queryRunner.createForeignKey(
                "order_item",
                new TableForeignKey({
                    columnNames: ["codigoPedido"],
                    referencedColumnNames: ["codigoPedido"],
                    referencedTableName: "orders",
                    onDelete: "CASCADE"
                })
            );
        } else {
            console.log("Tabela 'orders' não existe, não foi possível criar a foreign key");
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("order_item");
        const foreignKey = table?.foreignKeys.find(
            fk => fk.columnNames.indexOf("codigoPedido") !== -1
        );
        if (foreignKey) {
            await queryRunner.dropForeignKey("order_item", foreignKey);
        }
        await queryRunner.dropTable("order_item");
    }
}
