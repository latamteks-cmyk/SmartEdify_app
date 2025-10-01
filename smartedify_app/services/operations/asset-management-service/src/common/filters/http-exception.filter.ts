import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface RFC7807ErrorResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  timestamp: string;
  trace_id?: string;
  tenant_id?: string;
  [key: string]: any;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const traceId = request.headers['x-trace-id'] as string || uuidv4();
    const tenantId = request['tenantId'] || null;

    let status: number;
    let message: string;
    let type: string;
    let title: string;
    let additionalInfo: Record<string, any> = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        additionalInfo = { ...(exceptionResponse as any) };
        delete additionalInfo.message;
        delete additionalInfo.statusCode;
      } else {
        message = exception.message;
      }

      type = this.getErrorType(status);
      title = this.getErrorTitle(status);
    } else {
      // Unhandled exceptions
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      type = 'https://smartedify.com/errors/internal-server-error';
      title = 'Internal Server Error';

      // Log the full exception for debugging
      this.logger.error(
        `Unhandled exception: ${exception}`,
        exception instanceof Error ? exception.stack : undefined,
        {
          traceId,
          tenantId,
          url: request.url,
          method: request.method,
        },
      );
    }

    const errorResponse: RFC7807ErrorResponse = {
      type,
      title,
      status,
      detail: message,
      instance: request.url,
      timestamp: new Date().toISOString(),
      trace_id: traceId,
      ...additionalInfo,
    };

    if (tenantId) {
      errorResponse.tenant_id = tenantId;
    }

    // Log error for observability
    this.logger.error(
      `HTTP ${status} - ${request.method} ${request.url} - ${message}`,
      {
        traceId,
        tenantId,
        status,
        userAgent: request.get('User-Agent'),
        ip: request.ip,
      },
    );

    response.status(status).json(errorResponse);
  }

  private getErrorType(status: number): string {
    const baseUrl = 'https://smartedify.com/errors';
    
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return `${baseUrl}/bad-request`;
      case HttpStatus.UNAUTHORIZED:
        return `${baseUrl}/unauthorized`;
      case HttpStatus.FORBIDDEN:
        return `${baseUrl}/forbidden`;
      case HttpStatus.NOT_FOUND:
        return `${baseUrl}/not-found`;
      case HttpStatus.CONFLICT:
        return `${baseUrl}/conflict`;
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return `${baseUrl}/validation-error`;
      case HttpStatus.TOO_MANY_REQUESTS:
        return `${baseUrl}/rate-limit-exceeded`;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return `${baseUrl}/internal-server-error`;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return `${baseUrl}/service-unavailable`;
      default:
        return `${baseUrl}/generic-error`;
    }
  }

  private getErrorTitle(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'Bad Request';
      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'Forbidden';
      case HttpStatus.NOT_FOUND:
        return 'Not Found';
      case HttpStatus.CONFLICT:
        return 'Conflict';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'Validation Error';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'Rate Limit Exceeded';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'Internal Server Error';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'Service Unavailable';
      default:
        return 'Error';
    }
  }
}