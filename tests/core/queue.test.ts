import { MessageQueue, QueueConfig } from '../../src/core/queue';
import { NostrError } from '../../src/core/errors';

describe('Message Queue Tests', () => {
  let queue: MessageQueue;
  const config: QueueConfig = {
    maxSize: 3,
    processingTimeout: 100,
    retryAttempts: 2,
    retryDelay: 50
  };

  beforeEach(() => {
    queue = new MessageQueue(config);
  });

  afterEach(() => {
    queue.clear();
  });

  describe('Message Handling', () => {
    it('should process messages successfully', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      queue.registerHandler('test', handler);

      await queue.enqueue('test', { data: 'test' });
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(handler).toHaveBeenCalledWith({ data: 'test' });
      expect(queue.getStatus().size).toBe(0);
    });

    it('should handle message processing failures', async () => {
      const handler = jest.fn()
        .mockRejectedValueOnce(new Error('Processing failed'))
        .mockResolvedValueOnce(undefined);

      queue.registerHandler('test', handler);
      await queue.enqueue('test', { data: 'test' });

      // Wait for retry
      await new Promise(resolve => setTimeout(resolve, config.retryDelay + 50));
      
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should respect max retry attempts', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Processing failed'));
      queue.registerHandler('test', handler);

      await queue.enqueue('test', { data: 'test' });

      // Wait for all retries
      await new Promise(resolve => 
        setTimeout(resolve, (config.retryAttempts + 1) * (config.retryDelay + 50))
      );
      
      expect(handler).toHaveBeenCalledTimes(config.retryAttempts);
      expect(queue.getStatus().size).toBe(0);
    });
  });

  describe('Queue Management', () => {
    it('should respect max queue size', async () => {
      const handler = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      queue.registerHandler('test', handler);

      // Fill queue to max
      await Promise.all([
        queue.enqueue('test', { data: 1 }),
        queue.enqueue('test', { data: 2 }),
        queue.enqueue('test', { data: 3 })
      ]);

      await expect(
        queue.enqueue('test', { data: 'overflow' })
      ).rejects.toThrow(NostrError);
    });

    it('should process messages in priority order', async () => {
      const processed: number[] = [];
      const handler = jest.fn().mockImplementation(async (data) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        processed.push(data.priority);
      });

      queue.registerHandler('test', handler);

      // Add messages in order to ensure consistent processing
      await queue.enqueue('test', { priority: 2 }, 2);
      await queue.enqueue('test', { priority: 1 }, 1);
      await queue.enqueue('test', { priority: 3 }, 3);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(processed).toEqual([3, 2, 1]);
    });

    it('should handle message timeout', async () => {
      const handler = jest.fn(async () => {
        await new Promise(resolve => 
          setTimeout(resolve, config.processingTimeout + 50)
        );
      });

      queue.registerHandler('test', handler);
      await queue.enqueue('test', { data: 'test' });

      // Wait for timeout and retry
      await new Promise(resolve => 
        setTimeout(resolve, config.processingTimeout + config.retryDelay + 50)
      );
      
      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe('Event Emission', () => {
    it('should emit messageProcessed event', (done) => {
      const handler = jest.fn().mockResolvedValue(undefined);
      queue.registerHandler('test', handler);

      queue.once('messageProcessed', (messageId) => {
        expect(messageId).toBeDefined();
        done();
      });

      queue.enqueue('test', { data: 'test' });
    });

    it('should emit messageFailed event', (done) => {
      let retryCount = 0;
      const maxRetries = config.retryAttempts;

      const handler = jest.fn().mockRejectedValue(new Error('Processing failed'));
      queue.registerHandler('test', handler);

      queue.on('messageFailed', (messageId, error) => {
        expect(messageId).toBeDefined();
        expect(error).toBeDefined();
        if (++retryCount === maxRetries) {
          done();
        }
      });

      queue.enqueue('test', { data: 'test' }).catch(() => {});
    }, 20000);
  });

  describe('Queue Status', () => {
    it('should report correct queue status', async () => {
      const handler = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      queue.registerHandler('test', handler);
      await queue.enqueue('test', { data: 'test1' });
      await queue.enqueue('test', { data: 'test2' });

      const status = queue.getStatus();
      expect(status.size).toBe(2);
      expect(status.processing).toBe(true);
      expect(status.oldestMessage).toBeDefined();
    });
  });
});