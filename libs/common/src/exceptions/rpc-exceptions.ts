import { RpcException } from '@nestjs/microservices';
import { RpcError } from '../interfaces/rpc-exception';

export class TypedRpcException extends RpcException {
  constructor(error: RpcError) {
    super(error);
  }
  getError(): RpcError {
    return super.getError() as RpcError;
  }
}
