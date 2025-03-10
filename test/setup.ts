import { jest } from '@jest/globals';

// Set default timeout
jest.setTimeout(10000);

// Mock WebSocket globally
jest.mock('ws', () => {
  return {
    WebSocket: jest.fn().mockImplementation(() => ({
      send: jest.fn(),
      on: jest.fn(),
      readyState: 1 // WebSocket.OPEN
    }))
  };
});