import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { HypertronErrorBody, HypertronException } from '../exceptions/hypertron.exception';

@Catch()
export class HypertronExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HypertronExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = this.resolveStatus(exception);
    const error = this.resolveBody(exception, status);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} failed: ${String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({ error });
  }

  private resolveStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveBody(exception: unknown, status: number): HypertronErrorBody {
    if (exception instanceof HypertronException) {
      return exception.error;
    }

    if (exception instanceof HttpException) {
      const payload = exception.getResponse();

      // ValidationPipe hands back { message: string[] }. Surface the first failure
      // so clients get something actionable instead of an array.
      if (typeof payload === 'object' && payload !== null) {
        const messages = (payload as { message?: unknown }).message;
        if (Array.isArray(messages) && typeof messages[0] === 'string') {
          return {
            type: 'invalid_request_error',
            code: 'validation_error',
            message: messages[0],
          };
        }
        if (typeof messages === 'string') {
          return {
            type: 'invalid_request_error',
            code: 'validation_error',
            message: messages,
          };
        }
      }

      return {
        type: 'invalid_request_error',
        code: 'request_failed',
        message: exception.message,
      };
    }

    return {
      type: 'api_error',
      code: 'internal_error',
      message:
        status >= HttpStatus.INTERNAL_SERVER_ERROR
          ? 'An unexpected error occurred.'
          : String(exception),
    };
  }
}
