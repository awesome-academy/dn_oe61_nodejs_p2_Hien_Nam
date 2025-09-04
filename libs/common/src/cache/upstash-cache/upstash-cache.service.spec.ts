/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { UpstashCacheService } from './upstash-cache.service';
import { BaseCacheService } from '../base-cache.service';

// Create mock Redis instance that will be reused
const mockRedisInstance = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  scan: jest.fn(),
  pipeline: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
};

// Mock ioredis
jest.mock('ioredis', () => {
  const mockConstructor = jest.fn().mockImplementation(() => mockRedisInstance);
  return {
    __esModule: true,
    default: mockConstructor,
  };
});

describe('UpstashCacheService', () => {
  let service: UpstashCacheService;
  let mockRedis: jest.Mocked<Redis>;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'UPSTASH_REDIS_URL') {
        return 'redis://localhost:6379';
      }
      return undefined;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset all mock functions
    Object.values(mockRedisInstance).forEach((mockFn) => {
      if (jest.isMockFunction(mockFn)) {
        mockFn.mockReset();
      }
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpstashCacheService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<UpstashCacheService>(UpstashCacheService);
    mockRedis = mockRedisInstance as unknown as jest.Mocked<Redis>;

    // Set up pipeline mock
    const mockPipeline = {
      del: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };
    mockRedis.pipeline.mockReturnValue(mockPipeline as never);

    const serviceWithLogger = service as unknown as {
      logger: { log: jest.Mock; error: jest.Mock; warn: jest.Mock; debug: jest.Mock };
    };
    jest.spyOn(serviceWithLogger.logger, 'log').mockImplementation();
    jest.spyOn(serviceWithLogger.logger, 'error').mockImplementation();
    jest.spyOn(serviceWithLogger.logger, 'warn').mockImplementation();
    jest.spyOn(serviceWithLogger.logger, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should extend BaseCacheService', () => {
      expect(service).toBeInstanceOf(BaseCacheService);
    });

    it('should create Redis instance with Upstash configuration', () => {
      const freshMockConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'UPSTASH_REDIS_URL') {
            return 'redis://localhost:6379';
          }
          return undefined;
        }),
      };

      const testService = new UpstashCacheService(
        freshMockConfigService as unknown as ConfigService,
      );

      expect(testService).toBeDefined();
      expect(testService).toBeInstanceOf(BaseCacheService);
    });

    it('should set up Redis event listeners', function (this: void) {
      expect(mockRedis.on).toHaveBeenCalledTimes(3);
      const calls = mockRedis.on.mock.calls;
      expect(calls[0][0]).toBe('connect');
      expect(typeof calls[0][1]).toBe('function');
      expect(calls[1][0]).toBe('error');
      expect(typeof calls[1][1]).toBe('function');
      expect(calls[2][0]).toBe('close');
      expect(typeof calls[2][1]).toBe('function');
    });

    it('should handle Redis connect event', function (this: void) {
      const connectHandler = mockRedis.on.mock.calls.find((call) => call[0] === 'connect')?.[1];
      connectHandler?.();
      const serviceWithLogger = service as unknown as { logger: { log: jest.Mock } };
      expect(serviceWithLogger.logger.log).toHaveBeenCalledWith('Upstash Redis connected');
    });

    it('should handle Redis error event', function (this: void) {
      const errorHandler = mockRedis.on.mock.calls.find((call) => call[0] === 'error')?.[1];
      const testError = new Error('Upstash Redis connection failed');
      errorHandler?.(testError);
      const serviceWithLogger = service as unknown as { logger: { error: jest.Mock } };
      expect(serviceWithLogger.logger.error).toHaveBeenCalledWith(
        'Upstash Redis error:',
        testError,
      );
    });

    it('should handle Redis close event', function (this: void) {
      const closeHandler = mockRedis.on.mock.calls.find((call) => call[0] === 'close')?.[1];
      closeHandler?.();
      const serviceWithLogger = service as unknown as { logger: { warn: jest.Mock } };
      expect(serviceWithLogger.logger.warn).toHaveBeenCalledWith('Upstash Redis closed');
    });
  });

  describe('onModuleDestroy', () => {
    it('should close Redis connection gracefully', async function (this: void) {
      mockRedis.quit.mockResolvedValue('OK');

      // Spy on the closeRedisConnection method from BaseCacheService
      const closeRedisConnectionSpy = jest.spyOn(
        service as UpstashCacheService & { closeRedisConnection: () => Promise<void> },
        'closeRedisConnection',
      );

      await service.onModuleDestroy();

      expect(closeRedisConnectionSpy).toHaveBeenCalled();
      expect(mockRedis.quit).toHaveBeenCalled();
      expect(service['logger'].log).toHaveBeenCalledWith('Redis connection closed gracefully');
    });

    it('should handle Redis quit error', async function (this: void) {
      const quitError = new Error('Quit failed');
      mockRedis.quit.mockRejectedValue(quitError);

      // Spy on the closeRedisConnection method from BaseCacheService
      const closeRedisConnectionSpy = jest.spyOn(
        service as UpstashCacheService & { closeRedisConnection: () => Promise<void> },
        'closeRedisConnection',
      );

      await service.onModuleDestroy();

      expect(closeRedisConnectionSpy).toHaveBeenCalled();
      expect(mockRedis.quit).toHaveBeenCalled();
      const serviceWithLogger = service as unknown as { logger: { error: jest.Mock } };
      expect(serviceWithLogger.logger.error).toHaveBeenCalledWith(
        'Error closing Redis connection:',
        quitError,
      );
    });
  });

  describe('inherited methods from BaseCacheService', () => {
    describe('generateKey', () => {
      it('should generate key with prefix only', () => {
        const result = service.generateKey('upstash-products');
        expect(result).toBe('upstash-products');
      });

      it('should generate key with prefix and parameters', () => {
        const result = service.generateKey('upstash-products', { userId: 123, category: 'food' });
        expect(result).toBe('upstash-products:category:food:userId:123');
      });

      it('should sort parameters alphabetically', () => {
        const result = service.generateKey('upstash-test', { zebra: 'z', alpha: 'a', beta: 'b' });
        expect(result).toBe('upstash-test:alpha:a:beta:b:zebra:z');
      });
    });

    describe('get', () => {
      it('should return parsed data when cache hit', async function (this: void) {
        const testData = { id: 1, name: 'Upstash Test Product' };
        mockRedis.get.mockResolvedValue(JSON.stringify(testData));

        const result = await service.get<typeof testData>('upstash:test:key');

        expect(result).toEqual(testData);
        expect(service['logger'].debug).toHaveBeenCalledWith('Cache get for key: upstash:test:key');
      });

      it('should return null when cache miss', async function (this: void) {
        mockRedis.get.mockResolvedValue(null);

        const result = await service.get<string>('upstash:test:key');

        expect(result).toBeNull();
        expect(service['logger'].debug).toHaveBeenCalledWith(
          'Cache get miss for key: upstash:test:key',
        );
      });
    });

    describe('set', () => {
      it('should cache data successfully with default TTL', async function (this: void) {
        const testData = { id: 1, name: 'Upstash Test Product' };
        mockRedis.setex.mockResolvedValue('OK');

        const result = await service.set('upstash:test:key', testData);

        expect(mockRedis.setex).toHaveBeenCalledWith(
          'upstash:test:key',
          3600, // DEFAULT_CACHE_TTL_1H
          JSON.stringify(testData),
        );
        expect(result).toBe(true);
      });

      it('should cache data with custom TTL', async function (this: void) {
        const testData = { id: 1, name: 'Upstash Test Product' };
        const customTTL = 1800;
        mockRedis.setex.mockResolvedValue('OK');

        const result = await service.set('upstash:test:key', testData, { ttl: customTTL });

        expect(mockRedis.setex).toHaveBeenCalledWith(
          'upstash:test:key',
          customTTL,
          JSON.stringify(testData),
        );
        expect(result).toBe(true);
      });
    });

    describe('getOrSet', () => {
      it('should return cached data when cache hit', async function (this: void) {
        const cachedData = { id: 1, name: 'Upstash Cached Product' };
        mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

        const callback = jest.fn();
        const result = await service.getOrSet('upstash:test:key', callback);

        expect(result).toEqual(cachedData);
        expect(callback).not.toHaveBeenCalled();
      });

      it('should execute callback and cache result when cache miss', async function (this: void) {
        const newData = { id: 2, name: 'Upstash New Product' };
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');

        const callback = jest.fn().mockResolvedValue(newData);
        const result = await service.getOrSet('upstash:test:key', callback);

        expect(result).toEqual(newData);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(mockRedis.setex).toHaveBeenCalledWith(
          'upstash:test:key',
          3600, // DEFAULT_CACHE_TTL_1H
          JSON.stringify(newData),
        );
      });
    });

    describe('delete', () => {
      it('should delete existing key successfully', async () => {
        mockRedis.del.mockResolvedValue(1);

        const result = await service.delete('upstash:test:key');

        expect(result).toBe(true);
        const serviceWithLogger = service as unknown as { logger: { debug: jest.Mock } };
        expect(serviceWithLogger.logger.debug).toHaveBeenCalledWith(
          'Deleted cache key: upstash:test:key (success)',
        );
      });

      it('should return false when key does not exist', async () => {
        mockRedis.del.mockResolvedValue(0);

        const result = await service.delete('upstash:nonexistent:key');

        expect(result).toBe(false);
        const serviceWithLogger = service as unknown as { logger: { debug: jest.Mock } };
        expect(serviceWithLogger.logger.debug).toHaveBeenCalledWith(
          'Deleted cache key: upstash:nonexistent:key (not found)',
        );
      });
    });

    describe('deleteByPattern', () => {
      it('should delete keys matching pattern successfully', async () => {
        const mockPipeline = {
          del: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
        };
        mockRedis.pipeline.mockReturnValue(mockPipeline as never);
        mockRedis.scan
          .mockResolvedValueOnce(['10', ['upstash:key1', 'upstash:key2', 'upstash:key3']])
          .mockResolvedValueOnce(['0', ['upstash:key4', 'upstash:key5']]);

        const result = await service.deleteByPattern('upstash:*');

        expect(mockRedis.scan).toHaveBeenCalledWith('0', 'MATCH', 'upstash:*', 'COUNT', 100);
        expect(mockPipeline.del).toHaveBeenCalledTimes(5);
        expect(result).toBe(5);
      });

      it('should return 0 when no keys match pattern', async () => {
        mockRedis.scan.mockResolvedValue(['0', []]);

        const result = await service.deleteByPattern('upstash:nonexistent:*');

        expect(result).toBe(0);
      });
    });
  });
});
