import { NostrWalletConnect } from '../src/nwc';
import WebSocket from 'ws';
import { generatePrivateKey, getPublicKey } from 'nostr-tools';
import { jest } from '@jest/globals';

// Mock ws module
jest.mock('ws', () => {
  // Create WebSocket constants
  const WS_CONSTANTS = {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
  };

  // Mock WebSocket class
  class MockWebSocketClass {
    public send: jest.Mock;
    public on: jest.Mock;
    public readyState: number;
    static CONNECTING = WS_CONSTANTS.CONNECTING;
    static OPEN = WS_CONSTANTS.OPEN;
    static CLOSING = WS_CONSTANTS.CLOSING;
    static CLOSED = WS_CONSTANTS.CLOSED;

    constructor() {
      this.send = jest.fn();
      this.on = jest.fn();
      this.readyState = WS_CONSTANTS.OPEN;
    }
  }

  // Create mock constructor
  const mock = jest.fn(() => new MockWebSocketClass()) as jest.Mock;
  
  // Add WebSocket constants to mock
  Object.defineProperties(mock, {
    CONNECTING: { value: MockWebSocketClass.CONNECTING },
    OPEN: { value: MockWebSocketClass.OPEN },
    CLOSING: { value: MockWebSocketClass.CLOSING },
    CLOSED: { value: MockWebSocketClass.CLOSED }
  });

  return mock;
});

// Create WebSocket constants
const WS_CONSTANTS = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

describe('NostrWalletConnect', () => {
  let nwc: NostrWalletConnect;
  const mockSecret = '71a8c14c1407c113601079c4302dab36460f0ccd0ad506f1f2dc73b5100e4f3c';
  const mockPubkey = 'b889ff5b1513b641e2a139f661a661364979c5beee91842f8f0ef42ab558e9d4';
  const mockConnectionString = `nostr+walletconnect:${mockPubkey}?relay=wss%3A%2F%2Frelay.getalby.com%2Fv1&secret=${mockSecret}`;

  beforeEach(() => {
    // Reset mocks
    jest.resetAllMocks();
    
    // Create a new instance with a short timeout
    nwc = new NostrWalletConnect({
      connectionString: mockConnectionString,
      appName: 'Test App',
      timeout: 1000 // Short timeout for tests
    });
  });

  describe('Connection', () => {
    it('should parse connection string correctly', () => {
      expect(nwc.getConnectionDetails()).toEqual({
        pubkey: mockPubkey,
        relayUrl: 'wss://relay.getalby.com/v1',
        secret: mockSecret
      });
    });

    it('should throw error for invalid connection string', () => {
      expect(() => {
        new NostrWalletConnect({
          connectionString: 'invalid://connection-string',
          appName: 'Test App'
        });
      }).toThrow('Invalid NWC protocol');
    });

    it('should connect to relay successfully', async () => {
      // Create mock WebSocket instance
      const mockWs = {
        send: jest.fn(),
        on: jest.fn(),
        readyState: WS_CONSTANTS.OPEN
      };

      // Mock 'on' method to trigger 'open' event
      mockWs.on.mockImplementation((event: unknown, cb: unknown) => {
        if (event === 'open' && typeof cb === 'function') {
          setTimeout(cb, 0);
        }
        return mockWs;
      });

      // Mock WebSocket constructor
      (WebSocket as unknown as jest.Mock).mockImplementation(() => mockWs);

      // Mock sendRequest for initial connection
      jest.spyOn(nwc as any, 'sendRequest').mockResolvedValueOnce({
        name: 'Test Wallet',
        methods: ['pay_invoice', 'get_balance', 'get_info']
      });

      const info = await nwc.connect();
      
      expect(info).toEqual({
        name: 'Test Wallet',
        pubkey: mockPubkey,
        supportedMethods: ['pay_invoice', 'get_balance', 'get_info']
      });
      expect(WebSocket).toHaveBeenCalledWith('wss://relay.getalby.com/v1');
    });
  });

  describe('Payment Operations', () => {
    let mockWs: any;

    beforeEach(async () => {
      // Create mock WebSocket instance
      mockWs = {
        send: jest.fn(),
        on: jest.fn(),
        readyState: WS_CONSTANTS.OPEN
      };

      // Mock 'on' method to trigger 'open' event
      mockWs.on.mockImplementation((event: unknown, cb: unknown) => {
        if (event === 'open' && typeof cb === 'function') {
          setTimeout(cb, 0);
        }
        return mockWs;
      });

      // Mock WebSocket constructor
      (WebSocket as unknown as jest.Mock).mockImplementation(() => mockWs);

      // Mock sendRequest for initial connection
      jest.spyOn(nwc as any, 'sendRequest').mockResolvedValueOnce({
        name: 'Test Wallet',
        methods: ['pay_invoice', 'get_balance', 'get_info']
      });

      await nwc.connect();
    });

    it('should pay invoice successfully', async () => {
      const bolt11 = 'lnbc1...';
      const mockPaymentHash = '123abc';

      // Mock successful payment response
      jest.spyOn(nwc as any, 'sendRequest').mockResolvedValueOnce({
        paymentHash: mockPaymentHash
      });

      const result = await nwc.payInvoice(bolt11);
      expect(result).toBe(mockPaymentHash);
      expect((nwc as any).sendRequest).toHaveBeenCalledWith(
        'pay_invoice',
        expect.objectContaining({
          invoice: bolt11
        })
      );
    });

    it('should get balance successfully', async () => {
      const mockBalance = 100000;

      // Mock balance response
      jest.spyOn(nwc as any, 'sendRequest').mockResolvedValueOnce({
        balance: mockBalance
      });

      const result = await nwc.getBalance();
      expect(result.balance).toBe(mockBalance);
    });

    it('should create invoice successfully', async () => {
      const mockBolt11 = 'lnbc2...';
      const invoiceOptions = {
        amount: 1000,
        description: 'Test payment',
        expiry: 3600
      };

      // Mock invoice creation response
      jest.spyOn(nwc as any, 'sendRequest').mockResolvedValueOnce({
        bolt11: mockBolt11
      });

      const result = await nwc.makeInvoice(invoiceOptions);
      expect(result).toBe(mockBolt11);
      expect((nwc as any).sendRequest).toHaveBeenCalledWith(
        'make_invoice',
        expect.objectContaining({
          amount: invoiceOptions.amount,
          description: invoiceOptions.description
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors', async () => {
      // Create mock WebSocket instance
      const mockWs = {
        send: jest.fn(),
        on: jest.fn(),
        readyState: WS_CONSTANTS.CLOSED
      };

      // Mock 'on' method to trigger 'error' event
      mockWs.on.mockImplementation((event: unknown, cb: unknown) => {
        if (event === 'error' && typeof cb === 'function') {
          setTimeout(() => cb(new Error('Connection failed')), 0);
        }
        return mockWs;
      });

      // Mock WebSocket constructor
      (WebSocket as unknown as jest.Mock).mockImplementation(() => mockWs);

      await expect(nwc.connect()).rejects.toThrow('Connection failed');
    });

    it('should handle payment errors', async () => {
      // Create mock WebSocket instance
      const mockWs = {
        send: jest.fn(),
        on: jest.fn(),
        readyState: WS_CONSTANTS.OPEN
      };

      // Mock 'on' method to trigger 'open' event
      mockWs.on.mockImplementation((event: unknown, cb: unknown) => {
        if (event === 'open' && typeof cb === 'function') {
          setTimeout(cb, 0);
        }
        return mockWs;
      });

      // Mock WebSocket constructor
      (WebSocket as unknown as jest.Mock).mockImplementation(() => mockWs);

      // Mock sendRequest for connection and payment
      const sendRequestSpy = jest.spyOn(nwc as any, 'sendRequest')
        .mockResolvedValueOnce({
          name: 'Test Wallet',
          methods: ['pay_invoice']
        })
        .mockRejectedValueOnce(new Error('Payment failed'));

      await nwc.connect();
      await expect(nwc.payInvoice('lnbc1...')).rejects.toThrow('Payment failed');
    });

    it('should handle timeout errors', async () => {
      // Create mock WebSocket instance
      const mockWs = {
        send: jest.fn(),
        on: jest.fn(),
        readyState: WS_CONSTANTS.OPEN
      };

      // Mock 'on' method to trigger 'open' event
      mockWs.on.mockImplementation((event: unknown, cb: unknown) => {
        if (event === 'open' && typeof cb === 'function') {
          cb();
        }
        return mockWs;
      });

      // Mock WebSocket constructor
      (WebSocket as unknown as jest.Mock).mockImplementation(() => mockWs);

      // Create NWC instance with very short timeout
      nwc = new NostrWalletConnect({
        connectionString: mockConnectionString,
        appName: 'Test App',
        timeout: 100 // 100ms timeout
      });

      // Mock sendRequest for connection
      jest.spyOn(nwc as any, 'sendRequest').mockResolvedValueOnce({
        name: 'Test Wallet',
        methods: ['pay_invoice']
      });

      await nwc.connect();

      // Mock the actual payment request to take longer than timeout
      const mockPaymentRequest = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timeout'));
        }, 200);
      });

      jest.spyOn(nwc as any, 'sendRequest').mockReturnValueOnce(mockPaymentRequest);

      await expect(nwc.payInvoice('lnbc1...')).rejects.toThrow('Request timeout');
    });
  });
});