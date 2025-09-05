import { TypedRpcException } from '../exceptions/rpc-exceptions';

export function assertRpcException(
  error: unknown,
  expectedCode: string,
  expectedError?: object,
): void {
  expect(error).toBeInstanceOf(TypedRpcException);
  const rpcError = (error as TypedRpcException).getError();
  expect(rpcError.code).toEqual(expectedCode);
  if (expectedError) {
    expect(rpcError).toEqual(expectedError);
  }
}
