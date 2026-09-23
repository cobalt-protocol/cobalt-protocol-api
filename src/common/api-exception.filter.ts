import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    if (status >= 500) this.logger.error(exception);
    const payload =
      exception instanceof HttpException ? exception.getResponse() : null;
    const details =
      typeof payload === 'object' && payload !== null && 'message' in payload
        ? payload.message
        : undefined;
    const message =
      status >= 500
        ? 'Internal server error'
        : Array.isArray(details)
          ? 'Validation failed'
          : typeof details === 'string'
            ? details
            : exception instanceof HttpException
              ? exception.message
              : 'Request failed';
    response.status(status).json({
      error: {
        code:
          status === 400
            ? 'VALIDATION_ERROR'
            : status === 401
              ? 'UNAUTHORIZED'
              : status === 403
                ? 'FORBIDDEN'
                : status === 404
                  ? 'NOT_FOUND'
                  : status === 409
                    ? 'CONFLICT'
                    : 'INTERNAL_ERROR',
        message,
        ...(Array.isArray(details) ? { details } : {}),
      },
      path: request.url,
    });
  }
}
