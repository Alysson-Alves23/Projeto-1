import { MigrationInterface, QueryRunner, Table } from "typeorm";
import {CreateOrdersTable1746660800225} from "@/database/migrations/1746660800225-CreateOrdersTable";

export class CreateCustomersTable1746660800223 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Verificar se a tabela já existe antes de criar
        const tableExists = await queryRunner.hasTable("customer");
        if (tableExists) {
            console.log("Tabela 'customer' já existe, pulando criação");
            return;
        }
        
        await queryRunner.createTable(
            new Table({
                name: "customer",
                columns: [
                    {
                        name: "id",
                        type: "int",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment"
                    },
                    {
                        name: "name",
                        type: "varchar",
                        length: "255"
                    }
                ]
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("customer");
    }
}