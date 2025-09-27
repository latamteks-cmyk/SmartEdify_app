import { DataSource } from 'typeorm';
import { getDatabaseConfig } from './database.config';

// We need to create a DataSource instance
// to be able to run migrations from the CLI.
export default new DataSource(getDatabaseConfig(false) as any);
