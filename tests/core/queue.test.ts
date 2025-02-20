import { MessageQueue, QueueConfig } from '../../src/core/queue';
import { NostrError } from '../../src/core/errors';

describe('Message Queue Tests', () => {
  let queue: MessageQueue;
  const config: QueueConfig = {
    maxSize: 100,
    processingTimeout: 1000,
    retryAttempts: 3,
    retryDelay: 100
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

      const messageId = await queue.enqueue('test', { data: 'test' });
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
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
      await new Promise(resolve => setTimeout(resolve, config.retryDelay + 100));
      
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should respect max retry attempts', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Processing failed'));
      queue.registerHandler('test', handler);

      const messageId = await queue.enqueue('test', { data: 'test' });

      // Wait for all retries
      await new Promise(resolve => 
        setTimeout(resolve, (config.retryAttempts + 1) * (config.retryDelay + 100))
      );
      
      expect(handler).toHaveBeenCalledTimes(config.retryAttempts);
      expect(queue.getStatus().size).toBe(0);
    });
  });

  describe('Queue Management', () => {
    it('should respect max queue size', async () => {
      queue.registerHandler('test', jest.fn());

      // Fill queue to max
      for (let i = 0; i < config.maxSize; i++) {
        await queue.enqueue('test', { data: i });
      }

      await expect(
        queue.enqueue('test', { data: 'overflow' })
      ).rejects.toThrow(NostrError);
    });

    it('should process messages in priority order', async () => {
      const processed: number[] = [];
      const handler = jest.fn(async (data) => {
        processed.push(data.priority);
      });

      queue.registerHandler('test', handler);

      await queue.enqueue('test', { priority: 2 }, 2);
      await queue.enqueue('test', { priority: 1 }, 1);
      await queue.enqueue('test', { priority: 3 }, 3);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(processed).toEqual([3, 2, 1]);
    });

    it('should handle message timeout', async () => {
      const handler = jest.fn(async () => {
        await new Promise(resolve => 
          setTimeout(resolve, config.processingTimeout + 100)
        );
      });

      queue.registerHandler('test', handler);
      await queue.enqueue('test', { data: 'test' });

      // Wait for timeout and retry
      await new Promise(resolve => 
        setTimeout(resolve, config.processingTimeout + config.retryDelay + 100)
      );
      
      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe('Event Emission', () => {
    it('should emit messageProcessed event', (done) => {
      const handler = jest.fn().mockResolvedValue(undefined);
      queue.registerHandler('test', handler);

      queue.on('messageProcessed', (messageId) => {
        expect(messageId).toBeDefined();
        done();
      });

      queue.enqueue('test', { data: 'test' });
    });

    it('should emit messageFailed event', (done) => {
      const handler = jest.fn().mockRejectedValue(new Error('Processing failed'));
      queue.registerHandler('test', handler);

      queue.on('messageFailed', (messageId, error) => {
        expect(messageId).toBeDefined();
        expect(error).toBeDefined();
        done();
      });

      queue.enqueue('test', { data: 'test' });
    });
  });

  describe('Queue Status', () => {
    it('should report correct queue status', async () => {
      const handler = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
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