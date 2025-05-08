#!/usr/bin/env node
import "reflect-metadata";
import * as dotenv from "dotenv";
import { AppDataSource } from "../../config/database";
import { runSeeders } from "./index";


dotenv.config();

async function checkTablesExist() {
    if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
    }
    
    try {
        const queryRunner = AppDataSource.createQueryRunner();

        const ordersTableExists = await queryRunner.hasTable('orders');
        const orderItemTableExists = await queryRunner.hasTable('order_item');
        await queryRunner.release();

        if (ordersTableExists && orderItemTableExists) {
            console.log("Todas as tabelas necessárias já existem no banco de dados.");
            return true;
        }

        console.log("ATENÇÃO: Algumas tabelas necessárias não existem:");
        if (!ordersTableExists) console.log("- Tabela 'orders' não existe");
        if (!orderItemTableExists) console.log("- Tabela 'order_item' não existe");
        
        return false;
    } catch (error) {
        console.error("Erro ao verificar existência das tabelas:", error);
        return false;
    }
}


console.log("Iniciando população do banco de dados...");
checkTablesExist()
    .then(tablesExist => {
        if (!tablesExist) {
            console.log("\nÉ necessário executar as migrations antes de prosseguir:");
            console.log("docker exec app npx typeorm migration:run -d dist/config/database.js");
            console.log("\nAbortando seeders devido à falta de tabelas necessárias.");
            process.exit(1);
        }
        
        console.log("Prosseguindo com a execução dos seeders...");
        return runSeeders();
    })
    .then(() => {
        console.log("Banco de dados populado com sucesso!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Erro ao popular banco de dados:", error);
        process.exit(1);
    });
