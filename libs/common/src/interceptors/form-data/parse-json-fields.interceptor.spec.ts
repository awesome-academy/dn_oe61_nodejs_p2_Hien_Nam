import { ExecutionContext, CallHandler } from '@nestjs/common';
import { ParseJsonFieldsInterceptor } from './parse-json-fields.interceptor';
import { of } from 'rxjs';

interface MockRequest {
  body: Record<string, unknown>;
}

const createMockExecutionContext = (body: Record<string, unknown>): ExecutionContext => {
  const mockRequest: MockRequest = { body };

  return {
    switchToHttp: () => ({
      getRequest: (): MockRequest => mockRequest,
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    getClass: jest.fn(),
    getHandler: jest.fn(),
  } as unknown as ExecutionContext;
};

const createMockCallHandler = (): CallHandler => {
  return {
    handle: jest.fn(() => of(null)),
  };
};

const getRequestBody = (context: ExecutionContext): Record<string, unknown> => {
  return context.switchToHttp().getRequest<MockRequest>().body;
};

describe('ParseJsonFieldsInterceptor', () => {
  let interceptor: ParseJsonFieldsInterceptor;

  beforeEach(() => {
    interceptor = new ParseJsonFieldsInterceptor(['field1', 'field2']);
  });

  it('should not modify body if fields array is empty', () => {
    interceptor = new ParseJsonFieldsInterceptor([]);
    const context = createMockExecutionContext({
      field1: '{"key": "value"}',
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: '{"key": "value"}',
    });
  });

  it('should skip fields that do not exist in body', () => {
    const context = createMockExecutionContext({
      otherField: 'value',
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      otherField: 'value',
    });
  });

  it('should skip fields with null or undefined values', () => {
    const context = createMockExecutionContext({
      field1: null,
      field2: undefined,
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: null,
      field2: undefined,
    });
  });

  it('should skip fields with non-string values', () => {
    const context = createMockExecutionContext({
      field1: 123,
      field2: true,
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: 123,
      field2: true,
    });
  });

  it('should parse valid JSON strings', () => {
    const context = createMockExecutionContext({
      field1: '{"name": "test", "value": 123}',
      field2: '["item1", "item2", "item3"]',
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: { name: 'test', value: 123 },
      field2: ['item1', 'item2', 'item3'],
    });
  });

  it('should parse JSON objects with nested structures', () => {
    const context = createMockExecutionContext({
      field1: '{"user": {"id": 1, "name": "John"}, "active": true}',
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: {
        user: { id: 1, name: 'John' },
        active: true,
      },
    });
  });

  it('should parse JSON arrays with mixed types', () => {
    const context = createMockExecutionContext({
      field1: '[1, "string", true, null, {"key": "value"}]',
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: [1, 'string', true, null, { key: 'value' }],
    });
  });

  it('should handle empty JSON objects and arrays', () => {
    const context = createMockExecutionContext({
      field1: '{}',
      field2: '[]',
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: {},
      field2: [],
    });
  });

  it('should throw error for invalid JSON strings', () => {
    const context = createMockExecutionContext({
      field1: '{"invalid": json}',
    });
    const next = createMockCallHandler();

    expect(() => {
      interceptor.intercept(context, next);
    }).toThrow();
  });

  it('should throw error for malformed JSON strings', () => {
    const context = createMockExecutionContext({
      field1: '{"name": "test",}', // trailing comma
    });
    const next = createMockCallHandler();

    expect(() => {
      interceptor.intercept(context, next);
    }).toThrow();
  });

  it('should throw error for incomplete JSON strings', () => {
    const context = createMockExecutionContext({
      field1: '{"name": "test"', // missing closing brace
    });
    const next = createMockCallHandler();

    expect(() => {
      interceptor.intercept(context, next);
    }).toThrow();
  });

  it('should process only specified fields', () => {
    const context = createMockExecutionContext({
      field1: '{"processed": true}',
      field2: '["processed"]',
      field3: '{"not_processed": true}',
      otherField: '{"also_not_processed": true}',
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: { processed: true },
      field2: ['processed'],
      field3: '{"not_processed": true}',
      otherField: '{"also_not_processed": true}',
    });
  });

  it('should handle mixed field types correctly', () => {
    const context = createMockExecutionContext({
      field1: '{"json": "string"}',
      field2: '["array", "data"]', // Valid JSON for field2
      field3: 123,
      field4: true,
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: { json: 'string' },
      field2: ['array', 'data'],
      field3: 123,
      field4: true,
    });
  });

  it('should throw error when trying to parse non-JSON string in specified field', () => {
    const context = createMockExecutionContext({
      field1: 'not a json string',
    });
    const next = createMockCallHandler();

    expect(() => {
      interceptor.intercept(context, next);
    }).toThrow();
  });

  it('should parse JSON with special characters and unicode', () => {
    const context = createMockExecutionContext({
      field1: '{"message": "Hello 世界! 🌍", "emoji": "😀"}',
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: { message: 'Hello 世界! 🌍', emoji: '😀' },
    });
  });

  it('should parse JSON with numbers and booleans', () => {
    const context = createMockExecutionContext({
      field1: '{"int": 42, "float": 3.14, "bool": true, "nullValue": null}',
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: { int: 42, float: 3.14, bool: true, nullValue: null },
    });
  });

  it('should call next.handle() and return its result', () => {
    const context = createMockExecutionContext({
      field1: '{"test": true}',
    });
    const next = createMockCallHandler();
    const handleSpy = jest.spyOn(next, 'handle');

    const result = interceptor.intercept(context, next);

    expect(handleSpy).toHaveBeenCalledTimes(1);
    expect(result).toBeDefined();
  });

  it('should preserve original body structure when no fields match', () => {
    interceptor = new ParseJsonFieldsInterceptor(['nonExistentField']);
    const originalBody = {
      name: 'test',
      value: 123,
      nested: { key: 'value' },
      array: [1, 2, 3],
    };
    const context = createMockExecutionContext(originalBody);
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual(originalBody);
  });
});
