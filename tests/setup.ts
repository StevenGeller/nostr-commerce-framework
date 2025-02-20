// Jest setup file
import { jest } from '@jest/globals';

// Set up global mocks and configuration
global.console = {
  ...console,
  // Uncomment to disable console.log during tests
  // log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});