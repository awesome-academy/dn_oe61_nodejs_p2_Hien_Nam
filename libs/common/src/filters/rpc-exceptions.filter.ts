import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { throwError } from 'rxjs';

@Catch()
export class RpcExceptionsFilter implements ExceptionFilter {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  catch(exception: unknown, host: ArgumentsHost) {
    return throwError(() => exception);
  }
}
