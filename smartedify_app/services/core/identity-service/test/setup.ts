// Test setup file (TypeORM DataSource)
import { DataSource } from 'typeorm';
import { testDbConfig } from './utils/test-data';

let dataSource: DataSource;

beforeAll(async () => {
  // Set up test database connection using DataSource (TypeORM >= 0.3)
  dataSource = new DataSource(testDbConfig as any);
  await dataSource.initialize();
});

afterAll(async () => {
  // Close database connection
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy();
  }
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});
