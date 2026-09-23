import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface.js';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((res) => {
        if (
          res &&
          typeof res === 'object' &&
          'data' in res &&
          'message' in res &&
          'errors' in res
        ) {
          return res;
        }

        return {
          data: res ?? null,
          message: 'Success',
          errors: null,
        };
      }),
    );
  }
}
