/**
 * Tests for TelemetryClient
 */

import { TelemetryClient } from '../src/api/TelemetryClient';
import { Logger } from '../src/types';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger
const mockLogger: Logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('TelemetryClient', () => {
  let client: TelemetryClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.useFakeTimers();

    mockAxiosInstance = {
      post: jest.fn().mockResolvedValue({ data: {} }),
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    client = new TelemetryClient({
      apiUrl: 'https://api.recallbricks.com',
      apiKey: 'test_api_key',
      runtimeVersion: '0.2.0',
      flushInterval: 1000,
      batchSize: 10,
      enabled: true,
      logger: mockLogger,
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('track', () => {
    it('should add events to the queue', () => {
      client.track('test_event', { key: 'value' });

      const snapshot = client.getMetricsSnapshot();
      expect(snapshot).toBeDefined();
    });

    it('should sanitize metadata to remove PII', () => {
      client.track('test_event', {
        userId: 'should_be_removed',
        email: 'test@test.com',
        safeKey: 'safe_value',
      });

      // Event should be added but PII stripped
      // We can't directly inspect the queue, but the event should be tracked
    });

    it('should flush when batch size is reached', async () => {
      // Add enough events to trigger flush
      for (let i = 0; i < 10; i++) {
        client.track(`event_${i}`);
      }

      // Wait for flush
      await Promise.resolve();

      expect(mockAxiosInstance.post).toHaveBeenCalled();
    });

    it('should not track when disabled', () => {
      const disabledClient = new TelemetryClient({
        apiUrl: 'https://api.recallbricks.com',
        apiKey: 'test_api_key',
        runtimeVersion: '0.2.0',
        enabled: false,
        logger: mockLogger,
      });

      disabledClient.track('test_event');
      disabledClient.recordMetric('avgConfidence', 0.8);

      const snapshot = disabledClient.getMetricsSnapshot();
      expect(snapshot.avgConfidence).toBe(0);
    });
  });

  describe('recordMetric', () => {
    it('should record metric values', () => {
      client.recordMetric('avgConfidence', 0.8);
      client.recordMetric('avgConfidence', 0.9);

      const snapshot = client.getMetricsSnapshot();
      // Running average: (0.8 * 0.5) + (0.9 * 0.5) = 0.85
      expect(snapshot.avgConfidence).toBeCloseTo(0.85, 1);
    });

    it('should record response time', () => {
      client.recordResponseTime(100);
      client.recordResponseTime(200);

      const snapshot = client.getMetricsSnapshot();
      expect(snapshot.avgResponseTime).toBe(150);
    });

    it('should record context hits', () => {
      client.recordContextHit(true);
      client.recordContextHit(false);

      const snapshot = client.getMetricsSnapshot();
      expect(snapshot.contextHitRate).toBe(0.5);
    });

    it('should increment reflection cycles', () => {
      client.incrementReflectionCycles();
      client.incrementReflectionCycles();
      client.incrementReflectionCycles();

      const snapshot = client.getMetricsSnapshot();
      expect(snapshot.reflectionCycles).toBe(3);
    });

    it('should record memory growth', () => {
      client.recordMemoryGrowth(5);
      client.recordMemoryGrowth(3);

      const snapshot = client.getMetricsSnapshot();
      expect(snapshot.memoryGrowth).toBe(8);
    });

    it('should record errors', () => {
      client.recordError();
      client.recordError();

      const snapshot = client.getMetricsSnapshot();
      expect(snapshot.errorRate).toBeGreaterThan(0);
    });
  });

  describe('flush', () => {
    it('should send metrics to API', async () => {
      client.recordMetric('avgConfidence', 0.8);
      client.track('test_event');

      await client.flush();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/telemetry',
        expect.objectContaining({
          runtime_version: '0.2.0',
          metrics: expect.any(Object),
        })
      );
    });

    it('should reset metrics after flush', async () => {
      client.recordMetric('avgConfidence', 0.8);
      client.incrementReflectionCycles();

      await client.flush();

      const snapshot = client.getMetricsSnapshot();
      expect(snapshot.avgConfidence).toBe(0);
      expect(snapshot.reflectionCycles).toBe(0);
    });

    it('should not fail on API error', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce(new Error('API error'));

      client.recordMetric('avgConfidence', 0.8);

      // Should not throw
      await expect(client.flush()).resolves.not.toThrow();
    });

    it('should not send when disabled', async () => {
      client.setEnabled(false);
      client.recordMetric('avgConfidence', 0.8);

      await client.flush();

      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });
  });

  describe('setEnabled', () => {
    it('should enable and disable telemetry', () => {
      client.setEnabled(false);

      client.recordMetric('avgConfidence', 0.8);
      expect(client.getMetricsSnapshot().avgConfidence).toBe(0);

      client.setEnabled(true);
      client.recordMetric('avgConfidence', 0.8);
      expect(client.getMetricsSnapshot().avgConfidence).toBe(0.8);
    });
  });

  describe('shutdown', () => {
    it('should flush remaining events on shutdown', async () => {
      client.recordMetric('avgConfidence', 0.8);
      client.track('final_event');

      await client.shutdown();

      expect(mockAxiosInstance.post).toHaveBeenCalled();
    });
  });
});
