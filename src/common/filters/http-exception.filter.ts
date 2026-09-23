import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface.js';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';
    let errors: any = null;

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const respObj = exceptionResponse as Record<string, any>;
        if (Array.isArray(respObj.message)) {
          message = 'Validation failed';
          errors = respObj.message;
        } else if (typeof respObj.message === 'string') {
          message = respObj.message;
          errors = respObj.errors ?? null;
        } else {
          message = respObj.error || exception.message;
          errors = respObj.errors ?? null;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errors = [exception.message];
      this.logger.error(
        `Unhandled Exception: ${exception.message}`,
        exception.stack,
      );
    }

    const body: ApiResponse<null> = {
      data: null,
      message,
      errors,
    };

    response.status(status).json(body);
  }
}
