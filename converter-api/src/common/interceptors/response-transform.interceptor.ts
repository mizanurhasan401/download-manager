import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SKIP_RESPONSE_TRANSFORM_KEY } from '../decorators/skip-response-transform.decorator';
import { ApiResponse } from '../interfaces';

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | StreamableFile | T>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | StreamableFile | T> {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_RESPONSE_TRANSFORM_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skip) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data: T | ApiResponse<T> | StreamableFile) => {
        if (data instanceof StreamableFile) {
          return data;
        }

        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          'message' in data
        ) {
          return data as ApiResponse<T>;
        }

        return {
          success: true,
          message: 'Operation completed successfully',
          data: data as T,
        };
      }),
    );
  }
}
