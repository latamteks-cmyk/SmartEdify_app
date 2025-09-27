import { TypeOrmModuleOptions } from '@nestjs/typeorm';
export declare const getDatabaseConfig: (isTest?: boolean) => TypeOrmModuleOptions;
export declare const getProductionDatabaseConfig: () => TypeOrmModuleOptions;
export declare const getTestDatabaseConfig: () => TypeOrmModuleOptions;
