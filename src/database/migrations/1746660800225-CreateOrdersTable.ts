import { MigrationInterface, QueryRunner, Table } from "typeorm";

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
                name: "orders",
                columns: [
                    {
                        name: "codigoPedido",
                        type: "int",
                        isPrimary: true
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
                    }
                ]
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("orders");
    }
}