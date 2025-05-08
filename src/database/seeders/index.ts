import { AppDataSource } from "../../config/database";
import { OrderSeeder } from "./OrderSeeder";

/**
 * Verifica se as tabelas necessárias existem no banco de dados
 */
async function checkTablesExist() {
    if (process.env.SKIP_TABLE_CHECK === 'true') {
        console.log("Pulando verificação de tabelas (SKIP_TABLE_CHECK=true)");
        return true;
    }

    const queryRunner = AppDataSource.createQueryRunner();
    try {
        const ordersTableExists = await queryRunner.hasTable('orders');
        const orderItemTableExists = await queryRunner.hasTable('order_item');

        if (  !ordersTableExists || !orderItemTableExists) {
            console.log("ATENÇÃO: Algumas tabelas necessárias não existem:");
            if (!ordersTableExists) console.log("- Tabela 'orders' não existe");
            if (!orderItemTableExists) console.log("- Tabela 'order_item' não existe");

            console.log("\nÉ necessário executar as migrations antes dos seeders!");
            console.log("Ou execute com SKIP_TABLE_CHECK=true para ignorar esta verificação");
            return false;
        }

        return true;
    } catch (error) {
        console.error("Erro ao verificar tabelas:", error);
        return false;
    } finally {
        await queryRunner.release();
    }
}

/**
 * Função para executar todos os seeders em sequência
 */
export async function runSeeders() {
    if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
        console.log("Conexão com o banco de dados inicializada para seeders");
    }

    try {

        const tablesExist = await checkTablesExist();
        if (!tablesExist) {
            console.log("Abortando seeders devido à falta de tabelas necessárias.");
            return;
        }

        console.log("Iniciando execução dos seeders...");

        await new OrderSeeder(AppDataSource).run();

        console.log("Todos os seeders foram executados com sucesso!");
    } catch (error) {
        console.error("Erro ao executar seeders:", error);
        throw error;
    } finally {
        // Fechar conexão ao terminar
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
            console.log("Conexão com o banco de dados fechada");
        }
    }
}

// Executar seeders se este arquivo for chamado diretamente
if (require.main === module) {
    runSeeders()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("Erro na execução dos seeders:", error);
            process.exit(1);
        });
}

