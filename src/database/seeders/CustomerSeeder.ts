import { Seeder } from "./Seeder";
import { Customer } from "../../models/Customer";
import { DataSource } from "typeorm";

export class CustomerSeeder extends Seeder {
    constructor(dataSource: DataSource) {
        super(dataSource);
    }

    async run(): Promise<void> {
        const customerRepository = this.dataSource.getRepository(Customer);
        

        const count = await customerRepository.count();
        if (count > 0) {
            console.log('Clientes já existem na base de dados. Pulando seeding...');
            return;
        }

        const customers = [
            { name: "João Silva" },
            { name: "Maria Oliveira" },
            { name: "Carlos Andrade" },
            { name: "Ana Souza" },
            { name: "Pedro Santos" },
        ];

        const customerEntities = customers.map(customer => {
            return customerRepository.create(customer);
        });

        await customerRepository.save(customerEntities);
        console.log(`${customerEntities.length} clientes foram inseridos.`);
    }
}
