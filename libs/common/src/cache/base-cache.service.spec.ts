/* eslint-disable @typescript-eslint/unbound-method */
import Redis from 'ioredis';
import { BaseCacheService } from './base-cache.service';
import { DEFAULT_CACHE_TTL_1H, MAX_DATA_BYTES } from '../constant/cache.constant';

// Create a concrete implementation for testing
class TestCacheService extends BaseCacheService {
  protected redis: Redis;

  constructor() {
    super('TestCacheService');
    this.redis = mockRedisInstance as unknown as Redis;
  }
}

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

describe('BaseCacheService', () => {
  let service: TestCacheService;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all mock functions
    Object.values(mockRedisInstance).forEach((mockFn) => {
      if (jest.isMockFunction(mockFn)) {
        mockFn.mockReset();
      }
    });

    service = new TestCacheService();
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

    it('should initialize logger with provided name', () => {
      expect(service['logger']).toBeDefined();
    });
  });

  describe('generateKey', () => {
    it('should generate key with prefix only', () => {
      const result = service.generateKey('products');
      expect(result).toBe('products');
    });

    it('should generate key with prefix and parameters', () => {
      const result = service.generateKey('products', { userId: 123, category: 'food' });
      expect(result).toBe('products:category:food:userId:123');
    });

    it('should sort parameters alphabetically', () => {
      const result = service.generateKey('test', { zebra: 'z', alpha: 'a', beta: 'b' });
      expect(result).toBe('test:alpha:a:beta:b:zebra:z');
    });

    it('should filter out undefined, null, and empty values', () => {
      const result = service.generateKey('products', {
        userId: 123,
        category: undefined,
        name: null as unknown as string,
        description: '',
        active: true,
      });
      expect(result).toBe('products:active:true:userId:123');
    });

    it('should handle boolean false and zero values correctly', () => {
      const result = service.generateKey('products', { active: false, count: 0 });
      expect(result).toBe('products:active:false:count:0');
    });

    it('should warn when prefix is empty', () => {
      service.generateKey('');
      const serviceWithLogger = service as unknown as { logger: { warn: jest.Mock } };
      expect(serviceWithLogger.logger.warn).toHaveBeenCalledWith('Prefix for cache key is empty!');
    });
  });

  describe('get', () => {
    it('should return parsed data when cache hit', async function (this: void) {
      const testData = { id: 1, name: 'Test Product' };
      mockRedis.get.mockResolvedValue(JSON.stringify(testData));

      const result = await service.get<typeof testData>('test:key');

      expect(result).toEqual(testData);
      expect(service['logger'].debug).toHaveBeenCalledWith('Cache get for key: test:key');
    });

    it('should return null when cache miss', async function (this: void) {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.get<string>('test:key');

      expect(result).toBeNull();
      expect(service['logger'].debug).toHaveBeenCalledWith('Cache get miss for key: test:key');
    });

    it('should handle JSON parse error and delete corrupted key', async function (this: void) {
      mockRedis.get.mockResolvedValue('invalid-json');
      mockRedis.del.mockResolvedValue(1);

      const result = await service.get<Record<string, unknown>>('test:key');

      expect(result).toBeNull();
      expect(mockRedis.del).toHaveBeenCalledWith('test:key');
      expect(service['logger'].error).toHaveBeenCalledWith(
        'JSON parse get<> error for key test:key:',
        expect.objectContaining({ name: 'SyntaxError' }),
      );
    });

    it('should handle Redis get error', async function (this: void) {
      const redisError = new Error('Redis connection failed');
      mockRedis.get.mockRejectedValue(redisError);

      const result = await service.get<string>('test:key');

      expect(result).toBeNull();
      expect(service['logger'].error).toHaveBeenCalledWith(
        'Redis get error for key test:key:',
        redisError,
      );
    });
  });

  describe('set', () => {
    it('should cache data successfully with default TTL', async function (this: void) {
      const testData = { id: 1, name: 'Test Product' };
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.set('test:key', testData);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test:key',
        DEFAULT_CACHE_TTL_1H,
        JSON.stringify(testData),
      );
      expect(result).toBe(true);
    });

    it('should cache data with custom TTL', async function (this: void) {
      const testData = { id: 1, name: 'Test Product' };
      const customTTL = 1800;
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.set('test:key', testData, { ttl: customTTL });

      expect(mockRedis.setex).toHaveBeenCalledWith('test:key', customTTL, JSON.stringify(testData));
      expect(result).toBe(true);
    });

    it('should return false when key is empty', async () => {
      const result = await service.set('', { data: 'test' });

      expect(result).toBe(false);
      const serviceWithLogger = service as unknown as { logger: { error: jest.Mock } };
      expect(serviceWithLogger.logger.error).toHaveBeenCalledTimes(1);
      expect(serviceWithLogger.logger.error).toHaveBeenCalledWith(
        'Redis set error for key :',
        expect.anything(),
      );
    });

    it('should warn when caching null or undefined data', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await service.set('test:key', null);
      const serviceWithLogger = service as unknown as { logger: { warn: jest.Mock } };
      expect(serviceWithLogger.logger.warn).toHaveBeenCalledWith(
        'Attempting to cache empty value for key: test:key',
      );

      await service.set('test:key2', undefined);
      const serviceWithLogger2 = service as unknown as { logger: { warn: jest.Mock } };
      expect(serviceWithLogger2.logger.warn).toHaveBeenCalledWith(
        'Attempting to cache empty value for key: test:key2',
      );
    });

    it('should warn when caching large data', async function (this: void) {
      const largeData = 'x'.repeat(MAX_DATA_BYTES + 1);
      mockRedis.setex.mockResolvedValue('OK');

      await service.set('test:key', largeData);

      const serviceWithLogger = service as unknown as { logger: { warn: jest.Mock } };
      expect(serviceWithLogger.logger.warn).toHaveBeenCalledWith(
        expect.stringMatching(/Large cache entry for key test:key: \d+ bytes/),
      );
    });

    it('should handle Redis setex error', async () => {
      const redisError = new Error('Redis connection failed');
      mockRedis.setex.mockRejectedValue(redisError);

      const result = await service.set('test:key', { data: 'test' });

      expect(result).toBe(false);
      const serviceWithLogger = service as unknown as { logger: { error: jest.Mock } };
      expect(serviceWithLogger.logger.error).toHaveBeenCalledWith(
        'Redis set error for key test:key:',
        redisError,
      );
    });
  });

  describe('getOrSet', () => {
    it('should return cached data when cache hit', async function (this: void) {
      const cachedData = { id: 1, name: 'Cached Product' };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const callback = jest.fn();
      const result = await service.getOrSet('test:key', callback);

      expect(result).toEqual(cachedData);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should execute callback and cache result when cache miss', async function (this: void) {
      const newData = { id: 2, name: 'New Product' };
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const callback = jest.fn().mockResolvedValue(newData);
      const result = await service.getOrSet('test:key', callback);

      expect(result).toEqual(newData);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test:key',
        DEFAULT_CACHE_TTL_1H,
        JSON.stringify(newData),
      );
    });

    it('should throw error when key is empty', async () => {
      const callback = jest.fn();
      await expect(service.getOrSet('', callback)).rejects.toThrow('Cache key must not be empty');
    });

    it('should return callback result even when caching fails', async () => {
      const newData = { id: 2, name: 'New Product' };
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockRejectedValue(new Error('Redis error'));

      const callback = jest.fn().mockResolvedValue(newData);
      const result = await service.getOrSet('test:key', callback);

      expect(result).toEqual(newData);
      const serviceWithLogger = service as unknown as { logger: { warn: jest.Mock } };
      expect(serviceWithLogger.logger.warn).toHaveBeenCalledWith(
        'Failed to cache data for key: test:key',
      );
    });

    it('should propagate callback errors', async () => {
      const callbackError = new Error('Callback failed');
      mockRedis.get.mockResolvedValue(null);

      const callback = jest.fn().mockRejectedValue(callbackError);

      await expect(service.getOrSet('test:key', callback)).rejects.toThrow(callbackError);
      const serviceWithLogger = service as unknown as { logger: { error: jest.Mock } };
      expect(serviceWithLogger.logger.error).toHaveBeenCalledWith(
        'Callback error for key test:key:',
        callbackError,
      );
    });
  });

  describe('delete', () => {
    it('should delete existing key successfully', async () => {
      mockRedis.del.mockResolvedValue(1);

      const result = await service.delete('test:key');

      expect(result).toBe(true);
      const serviceWithLogger = service as unknown as { logger: { debug: jest.Mock } };
      expect(serviceWithLogger.logger.debug).toHaveBeenCalledWith(
        'Deleted cache key: test:key (success)',
      );
    });

    it('should return false when key does not exist', async () => {
      mockRedis.del.mockResolvedValue(0);

      const result = await service.delete('nonexistent:key');

      expect(result).toBe(false);
      const serviceWithLogger = service as unknown as { logger: { debug: jest.Mock } };
      expect(serviceWithLogger.logger.debug).toHaveBeenCalledWith(
        'Deleted cache key: nonexistent:key (not found)',
      );
    });

    it('should handle Redis delete error', async () => {
      const redisError = new Error('Redis connection failed');
      mockRedis.del.mockRejectedValue(redisError);

      const result = await service.delete('test:key');

      expect(result).toBe(false);
      const serviceWithLogger = service as unknown as { logger: { error: jest.Mock } };
      expect(serviceWithLogger.logger.error).toHaveBeenCalledWith(
        'Redis delete error for key test:key:',
        redisError,
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
        .mockResolvedValueOnce(['10', ['key1', 'key2', 'key3']])
        .mockResolvedValueOnce(['0', ['key4', 'key5']]);

      const result = await service.deleteByPattern('test:*');

      expect(mockRedis.scan).toHaveBeenCalledWith('0', 'MATCH', 'test:*', 'COUNT', 100);
      expect(mockPipeline.del).toHaveBeenCalledTimes(5);
      expect(result).toBe(5);
    });

    it('should return 0 when no keys match pattern', async () => {
      mockRedis.scan.mockResolvedValue(['0', []]);

      const result = await service.deleteByPattern('nonexistent:*');

      expect(result).toBe(0);
    });

    it('should handle Redis scan error', async () => {
      const scanError = new Error('Redis scan failed');
      mockRedis.scan.mockRejectedValue(scanError);

      const result = await service.deleteByPattern('test:*');

      expect(result).toBe(0);
      expect(service['logger'].error).toHaveBeenCalledWith(
        'Redis pattern delete error for pattern test:*:',
        scanError,
      );
    });
  });

  describe('closeRedisConnection', () => {
    it('should close Redis connection gracefully', async () => {
      mockRedis.quit.mockResolvedValue('OK');

      await service['closeRedisConnection']();

      expect(mockRedis.quit).toHaveBeenCalled();
      expect(service['logger'].log).toHaveBeenCalledWith('Redis connection closed gracefully');
    });

    it('should handle Redis quit error', async () => {
      const quitError = new Error('Quit failed');
      mockRedis.quit.mockRejectedValue(quitError);

      await service['closeRedisConnection']();

      expect(mockRedis.quit).toHaveBeenCalled();
      const serviceWithLogger = service as unknown as { logger: { error: jest.Mock } };
      expect(serviceWithLogger.logger.error).toHaveBeenCalledWith(
        'Error closing Redis connection:',
        quitError,
      );
    });
  });
});
