import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class NoCacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    if (req && req.headers) {
      delete req.headers['if-none-match'];
      delete req.headers['if-modified-since'];
    }

    const applyNoCacheHeaders = () => {
      if (res && typeof res.setHeader === 'function') {
        res.setHeader(
          'Cache-Control',
          'no-store, no-cache, must-revalidate, proxy-revalidate',
        );
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
        if (typeof res.removeHeader === 'function') {
          res.removeHeader('ETag');
        }
      }
    };

    applyNoCacheHeaders();

    return next.handle().pipe(
      catchError((err) => {
        applyNoCacheHeaders();
        return throwError(() => err);
      }),
    );
  }
}

