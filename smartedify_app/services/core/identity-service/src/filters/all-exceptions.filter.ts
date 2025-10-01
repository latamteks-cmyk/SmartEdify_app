import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let detail = 'Internal server error';
    let type = 'about:blank';
    let title = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        detail = (exceptionResponse as any).message || exception.message;
        title = (exceptionResponse as any).error || exception.name;
        type = (exceptionResponse as any).type || type;
      } else {
        detail = exceptionResponse as string;
        title = exception.name;
      }
    } else if (exception instanceof Error) {
      detail = exception.message;
      title = exception.name;
    }

    this.logger.error(
      `HTTP Status: ${status} Error Message: ${detail}`,
      exception instanceof Error ? exception.stack : 'No stack trace available',
    );

    response.status(status).json({
      type,
      title,
      status,
      detail,
      instance: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
