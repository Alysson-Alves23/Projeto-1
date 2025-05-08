import { DataSource } from "typeorm";

export abstract class Seeder {
    constructor(protected dataSource: DataSource) {}
    
    abstract run(): Promise<void>;
}
