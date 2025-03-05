import { NostrWalletConnect } from '../src/nwc';
import { EventEmitter } from 'events';

describe('NostrWalletConnect', () => {
  let nwc: NostrWalletConnect;
  const testConfig = {
    relayUrl: 'wss://relay.damus.io',
    secretKey: 'test-secret-key',
    walletPubkey: 'test-wallet-pubkey'
  };

  beforeEach(() => {
    nwc = new NostrWalletConnect(testConfig);
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(nwc).toBeInstanceOf(EventEmitter);
    });

    it('should generate new keypair if not provided', () => {
      const nwcWithoutKey = new NostrWalletConnect({
        relayUrl: testConfig.relayUrl
      });
      expect(nwcWithoutKey).toBeTruthy();
    });
  });

  describe('connect', () => {
    it('should connect to wallet', async () => {
      const connectPromise = nwc.connect();
      
      // Simulate successful connection response
      setTimeout(() => {
        nwc.emit('connected', { status: 'connected' });
      }, 100);

      await connectPromise;
      expect(nwc['connected']).toBe(true);
    });

    it('should throw error if wallet pubkey not provided', async () => {
      const nwcWithoutWallet = new NostrWalletConnect({
        relayUrl: testConfig.relayUrl
      });

      await expect(nwcWithoutWallet.connect()).rejects.toThrow('Wallet public key is required');
    });

    it('should timeout if no response received', async () => {
      await expect(nwc.connect()).rejects.toThrow('Connection timeout');
    });
  });

  describe('payInvoice', () => {
    beforeEach(async () => {
      // Connect before testing payments
      const connectPromise = nwc.connect();
      setTimeout(() => {
        nwc.emit('connected', { status: 'connected' });
      }, 100);
      await connectPromise;
    });

    it('should process payment successfully', async () => {
      const paymentRequest = {
        amount: 1000,
        invoice: 'lnbc...',
        comment: 'Test payment'
      };

      const paymentPromise = nwc.payInvoice(paymentRequest);

      // Simulate successful payment response
      setTimeout(() => {
        nwc.emit('payment', {
          preimage: 'test-preimage',
          paymentHash: 'test-hash',
          amount: paymentRequest.amount,
          timestamp: Math.floor(Date.now() / 1000)
        });
      }, 100);

      const payment = await paymentPromise;
      expect(payment.amount).toBe(paymentRequest.amount);
      expect(payment.preimage).toBe('test-preimage');
    });

    it('should throw error if not connected', async () => {
      await nwc.disconnect();
      
      await expect(nwc.payInvoice({
        amount: 1000,
        invoice: 'lnbc...'
      })).rejects.toThrow('Not connected to wallet');
    });

    it('should timeout if no response received', async () => {
      await expect(nwc.payInvoice({
        amount: 1000,
        invoice: 'lnbc...'
      })).rejects.toThrow('Payment timeout');
    });
  });

  describe('getInfo', () => {
    beforeEach(async () => {
      const connectPromise = nwc.connect();
      setTimeout(() => {
        nwc.emit('connected', { status: 'connected' });
      }, 100);
      await connectPromise;
    });

    it('should get wallet info', async () => {
      const infoPromise = nwc.getInfo();

      // Simulate info response
      setTimeout(() => {
        nwc.emit('info', {
          balance: 1000000,
          network: 'mainnet'
        });
      }, 100);

      const info = await infoPromise;
      expect(info.balance).toBe(1000000);
      expect(info.network).toBe('mainnet');
    });

    it('should throw error if not connected', async () => {
      await nwc.disconnect();
      await expect(nwc.getInfo()).rejects.toThrow('Not connected to wallet');
    });
  });

  describe('disconnect', () => {
    it('should disconnect and clean up', async () => {
      await nwc.disconnect();
      expect(nwc['connected']).toBe(false);
      expect(nwc['subscriptions'].size).toBe(0);
    });

    it('should emit disconnected event', async () => {
      const disconnectPromise = new Promise(resolve => {
        nwc.once('disconnected', resolve);
      });

      await nwc.disconnect();
      await disconnectPromise;
    });
  });
});