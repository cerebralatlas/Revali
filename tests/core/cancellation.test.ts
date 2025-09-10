// -----------------------------
// Unit Tests: Cancellation Module
// -----------------------------

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  cancel,
  cancelAll,
  isCancelled,
  getCancellationInfo,
  isCancellationError,
  createCancellationError,
  cancellationManager
} from '../../src/core/cancellation.js';
import { CancellationError } from '../../src/core/types.js';

describe('Cancellation Module', () => {
  beforeEach(() => {
    cancellationManager.cancelAll();
  });

  describe('Basic Cancellation', () => {
    it('should create and cancel requests', () => {
      const key = 'test-key';
      const controller = cancellationManager.create(key);

      expect(controller).toBeInstanceOf(AbortController);
      expect(controller.signal.aborted).toBe(false);
      expect(cancellationManager.hasController(key)).toBe(true);

      const cancelled = cancel(key);
      expect(cancelled).toBe(true);
      expect(controller.signal.aborted).toBe(true);
      expect(cancellationManager.hasController(key)).toBe(false);
    });

    it('should return false when cancelling non-existent key', () => {
      const cancelled = cancel('non-existent-key');
      expect(cancelled).toBe(false);
    });

    it('should cancel all active requests', () => {
      const keys = ['key1', 'key2', 'key3'];
      const controllers = keys.map(key => cancellationManager.create(key));

      controllers.forEach(controller => {
        expect(controller.signal.aborted).toBe(false);
      });

      const cancelledCount = cancelAll();
      expect(cancelledCount).toBe(3);

      controllers.forEach(controller => {
        expect(controller.signal.aborted).toBe(true);
      });

      keys.forEach(key => {
        expect(cancellationManager.hasController(key)).toBe(false);
      });
    });

    it('should handle multiple cancel calls gracefully', () => {
      const key = 'test-key';
      const controller = cancellationManager.create(key);

      const firstCancel = cancel(key);
      const secondCancel = cancel(key);

      expect(firstCancel).toBe(true);
      expect(secondCancel).toBe(false);
      expect(controller.signal.aborted).toBe(true);
    });
  });

  describe('Controller Management', () => {
    it('should replace existing controller when creating new one', () => {
      const key = 'test-key';
      const firstController = cancellationManager.create(key);
      const secondController = cancellationManager.create(key);

      expect(firstController).not.toBe(secondController);
      expect(firstController.signal.aborted).toBe(true);
      expect(secondController.signal.aborted).toBe(false);
      expect(cancellationManager.getController(key)).toBe(secondController);
    });

    it('should cleanup controller without cancelling', () => {
      const key = 'test-key';
      const controller = cancellationManager.create(key);

      cancellationManager.cleanup(key);

      expect(controller.signal.aborted).toBe(false);
      expect(cancellationManager.hasController(key)).toBe(false);
    });

    it('should get active count correctly', () => {
      expect(cancellationManager.getActiveCount()).toBe(0);

      cancellationManager.create('key1');
      cancellationManager.create('key2');
      expect(cancellationManager.getActiveCount()).toBe(2);

      cancel('key1');
      expect(cancellationManager.getActiveCount()).toBe(1);

      cancelAll();
      expect(cancellationManager.getActiveCount()).toBe(0);
    });
  });

  describe('Signal Combination', () => {
    it('should combine multiple signals', () => {
      const controller1 = new AbortController();
      const controller2 = new AbortController();
      const controller3 = new AbortController();

      const combinedSignal = cancellationManager.combineSignals(
        controller1.signal,
        controller2.signal,
        controller3.signal
      );

      expect(combinedSignal.aborted).toBe(false);

      controller2.abort();
      expect(combinedSignal.aborted).toBe(true);
    });

    it('should handle already aborted signals', () => {
      const controller1 = new AbortController();
      const controller2 = new AbortController();
      
      controller1.abort();

      const combinedSignal = cancellationManager.combineSignals(
        controller1.signal,
        controller2.signal
      );

      expect(combinedSignal.aborted).toBe(true);
    });

    it('should handle undefined signals', () => {
      const controller = new AbortController();
      
      const combinedSignal = cancellationManager.combineSignals(
        controller.signal,
        undefined,
        undefined
      );

      expect(combinedSignal.aborted).toBe(false);

      controller.abort();
      expect(combinedSignal.aborted).toBe(true);
    });

    it('should create timeout signal', async () => {
      const timeoutSignal = cancellationManager.createTimeoutSignal(10);
      
      expect(timeoutSignal.aborted).toBe(false);
      
      await new Promise(resolve => setTimeout(resolve, 15));
      
      expect(timeoutSignal.aborted).toBe(true);
    });
  });

  describe('Cancellation Info', () => {
    it('should provide cancellation info', () => {
      const info = getCancellationInfo();
      expect(info.activeCount).toBe(0);
      expect(info.keys).toEqual([]);

      cancellationManager.create('key1');
      cancellationManager.create('key2');

      const updatedInfo = getCancellationInfo();
      expect(updatedInfo.activeCount).toBe(2);
      expect(updatedInfo.keys).toContain('key1');
      expect(updatedInfo.keys).toContain('key2');
    });

    it('should check if key is cancelled', () => {
      const key = 'test-key';
      
      expect(isCancelled(key)).toBe(false);

      cancellationManager.create(key);
      expect(isCancelled(key)).toBe(false);

      cancel(key);
      expect(isCancelled(key)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should identify cancellation errors', () => {
      const cancellationError = new CancellationError('Test cancellation');
      const abortError = new DOMException('Test abort', 'AbortError');
      const regularError = new Error('Regular error');

      expect(isCancellationError(cancellationError)).toBe(true);
      expect(isCancellationError(abortError)).toBe(true);
      expect(isCancellationError(regularError)).toBe(false);
      expect(isCancellationError('string error')).toBe(false);
      expect(isCancellationError(null)).toBe(false);
    });

    it('should create cancellation error', () => {
      const key = 'test-key';
      const originalError = new Error('Original error');

      const error1 = createCancellationError(key);
      expect(error1).toBeInstanceOf(CancellationError);
      expect(error1.message).toBe('Request for "test-key" was cancelled');

      const error2 = createCancellationError(key, originalError);
      expect(error2).toBeInstanceOf(CancellationError);
      expect(error2.message).toBe('Request for "test-key" was cancelled: Original error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid create/cancel operations', () => {
      const key = 'rapid-test';
      const operations = 100;

      for (let i = 0; i < operations; i++) {
        const controller = cancellationManager.create(key);
        expect(controller.signal.aborted).toBe(false);
        
        const cancelled = cancel(key);
        expect(cancelled).toBe(true);
        expect(controller.signal.aborted).toBe(true);
      }

      expect(cancellationManager.hasController(key)).toBe(false);
    });

    it('should handle cleanup of many controllers', () => {
      const keys = Array.from({ length: 1000 }, (_, i) => `key-${i}`);
      
      keys.forEach(key => cancellationManager.create(key));
      expect(cancellationManager.getActiveCount()).toBe(1000);

      const cancelledCount = cancelAll();
      expect(cancelledCount).toBe(1000);
      expect(cancellationManager.getActiveCount()).toBe(0);
    });
  });
});
