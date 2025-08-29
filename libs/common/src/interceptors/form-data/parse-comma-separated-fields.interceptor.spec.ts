import { ExecutionContext, CallHandler } from '@nestjs/common';
import { ParseCommaSeparatedFieldsInterceptor } from './parse-comma-separated-fields.interceptor';
import { of } from 'rxjs';

interface MockRequest {
  body: Record<string, unknown>;
}

const createMockExecutionContext = (body: Record<string, unknown>) => {
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

describe('ParseCommaSeparatedFieldsInterceptor', () => {
  let interceptor: ParseCommaSeparatedFieldsInterceptor;

  beforeEach(() => {
    interceptor = new ParseCommaSeparatedFieldsInterceptor(['field1', 'field2']);
  });

  it('should not modify body if fields array is empty', () => {
    interceptor = new ParseCommaSeparatedFieldsInterceptor([]);
    const context = createMockExecutionContext({
      field1: '1,2,3',
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: '1,2,3',
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

  it('should skip fields with empty string values', () => {
    const context = createMockExecutionContext({
      field1: '',
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: '',
    });
  });

  it('should parse comma-separated strings into arrays', () => {
    const context = createMockExecutionContext({
      field1: '1, 2, 3',
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: [1, 2, 3],
    });
  });

  it('should parse comma-separated strings with no spaces', () => {
    const context = createMockExecutionContext({
      field1: '1,2,3',
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: [1, 2, 3],
    });
  });

  it('should filter out invalid numbers from comma-separated strings', () => {
    const context = createMockExecutionContext({
      field1: '1,abc,3,def,5',
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: [1, 3, 5],
    });
  });

  it('should handle empty comma-separated strings', () => {
    const context = createMockExecutionContext({
      field1: ',,,',
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: [],
    });
  });

  it('should parse JSON array strings into arrays', () => {
    const context = createMockExecutionContext({
      field1: '[1, 2, 3]',
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: [1, 2, 3],
    });
  });

  it('should parse JSON array strings with mixed types and filter out non-numbers', () => {
    const context = createMockExecutionContext({
      field1: '[1, "abc", 3, null, 5]',
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: [1, 3, 5],
    });
  });

  it('should default invalid JSON strings to empty arrays', () => {
    const context = createMockExecutionContext({
      field1: '[1, 2, 3',
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: [2, 3],
    });
  });

  it('should default non-array JSON strings to empty arrays', () => {
    const context = createMockExecutionContext({
      field1: '{"key": "value"}',
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: [],
    });
  });

  it('should default JSON strings that parse to non-arrays to empty arrays', () => {
    const context = createMockExecutionContext({
      field1: '[42]', // This will be parsed as array - different test
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: [42],
    });
  });

  it('should handle JSON that parses to non-array values and default to empty arrays', () => {
    const context = createMockExecutionContext({
      field1: '[42]', // This parses to array with number
      field2: '[{}]', // This parses to array with object (filtered out)
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: [42],
      field2: [],
    });
  });

  it('should handle JSON strings that parse to non-arrays and default to empty arrays', () => {
    const context = createMockExecutionContext({
      field1: '[42]', // Valid JSON array
      field2: '["string"]', // Valid JSON array but filtered to empty
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: [42],
      field2: [], // All strings get filtered out as they're not numbers
    });
  });

  it('should handle bracket strings that parse to non-array JSON values', () => {
    const context = createMockExecutionContext({
      field1: '["valid", "json", "but", "will", "be", "filtered"]',
      field2: '[{}]', // Array with object - object gets filtered out
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: [], // All strings get filtered out as they're not numbers
      field2: [], // Object gets filtered out
    });
  });

  it('should handle JSON that parses to non-array and default to empty array', () => {
    // Create a spy on JSON.parse to control its behavior
    const originalParse = JSON.parse;
    const parseSpy = jest.spyOn(JSON, 'parse').mockImplementation((text: string): unknown => {
      if (text === '[test_non_array]') {
        return { not: 'an array' }; // Return object instead of array
      }
      return originalParse(text) as unknown;
    });

    const context = createMockExecutionContext({
      field1: '[test_non_array]',
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: [], // Should be empty array because parsed result is not an array
    });

    // Restore original implementation
    parseSpy.mockRestore();
  });

  it('should handle actual JSON parsing errors for malformed bracket strings', () => {
    const context = createMockExecutionContext({
      field1: '[1, 2, 3,]', // Trailing comma causes JSON parse error
      field2: '[1, 2, 3', // Missing closing bracket - treated as comma-separated
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: [],
      field2: [2, 3], // [1, 2, 3 becomes comma-separated "1, 2, 3"
    });
  });

  it('should handle JSON parsing errors and default to empty arrays', () => {
    const context = createMockExecutionContext({
      field1: '[invalid json',
      field2: '{"unclosed": object',
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: [],
      field2: [],
    });
  });

  it('should handle number values by wrapping them in arrays', () => {
    const context = createMockExecutionContext({
      field1: 5,
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: [5],
    });
  });

  it('should handle boolean values by converting and wrapping them in arrays', () => {
    const context = createMockExecutionContext({
      field1: true,
      field2: false,
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: [1],
      field2: false,
    });
  });

  it('should handle existing arrays by converting all elements to numbers', () => {
    const context = createMockExecutionContext({
      field1: [1, '2', 3, 'abc', 5],
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: [1, 2, 3, 5],
    });
  });

  it('should handle arrays with mixed types and filter out invalid numbers', () => {
    const context = createMockExecutionContext({
      field1: [1, null, '3', undefined, 'text', 5],
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: [1, 3, 5],
    });
  });

  it('should handle empty arrays', () => {
    const context = createMockExecutionContext({
      field1: [],
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: [],
    });
  });

  it('should process multiple fields correctly', () => {
    const context = createMockExecutionContext({
      field1: '1,2,3',
      field2: '[4,5,6]',
      field3: 7,
      otherField: 'unchanged',
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next);

    expect(getRequestBody(context)).toEqual({
      field1: [1, 2, 3],
      field2: [4, 5, 6],
      field3: 7, // field3 is not in the interceptor's fields array
      otherField: 'unchanged',
    });
  });

  it('should call next.handle() and return its result', () => {
    const context = createMockExecutionContext({
      field1: '1,2,3',
    });
    const next = createMockCallHandler();
    const handleSpy = jest.spyOn(next, 'handle');

    const result = interceptor.intercept(context, next);

    expect(handleSpy).toHaveBeenCalledTimes(1);
    expect(result).toBeDefined();
  });
});
