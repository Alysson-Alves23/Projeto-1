import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateOrdersTable1746660800225 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Verificar se a tabela já existe antes de criar
        const tableExists = await queryRunner.hasTable("orders");
        if (tableExists) {
            console.log("Tabela 'orders' já existe, pulando criação");
            return;
        }
        
        await queryRunner.createTable(
            new Table({
                name: "orders", // Mudamos para o plural para evitar palavras reservadas
                columns: [
                    {
                        name: "id",
                        type: "int",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment"
                    },
                    {
                        name: "codigoPedido",
                        type: "int"
                    },
                    {
                        name: "codigoCliente",
                        type: "int"
                    },
                    {
                        name: "total",
                        type: "decimal",
                        precision: 10,
                        scale: 2
                    },
                    {
                        name: "customerId",
                        type: "int",
                        isNullable: true
                    }
                ]
            })
        );

        await queryRunner.createForeignKey(
            "orders",
            new TableForeignKey({
                columnNames: ["customerId"],
                referencedColumnNames: ["id"],
                referencedTableName: "customer",
                onDelete: "SET NULL"
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("orders"); // Nome da tabela atualizado
        const foreignKey = table?.foreignKeys.find(
            fk => fk.columnNames.indexOf("customerId") !== -1
        );
        if (foreignKey) {
            await queryRunner.dropForeignKey("orders", foreignKey); // Nome da tabela atualizado
        }
        await queryRunner.dropTable("orders"); // Nome da tabela atualizado
    }
}