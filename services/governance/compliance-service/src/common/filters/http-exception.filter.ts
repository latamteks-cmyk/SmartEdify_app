import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

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
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : (exceptionResponse as any).message || exception.message;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
    }

    const errorResponse: RFC7807ErrorResponse = {
      type: this.getErrorType(status),
      title: this.getErrorTitle(status),
      status,
      detail: message,
      instance: request.url,
      timestamp: new Date().toISOString(),
      trace_id: request.headers['x-trace-id'] as string,
      tenant_id: (request as any).tenantId,
    };

    response.status(status).json(errorResponse);
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
        return 'Unprocessable Entity';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'Too Many Requests';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'Internal Server Error';
      default:
        return 'Error';
    }
  }

  private getErrorType(status: number): string {
    const baseUrl = 'https://smartedify.global/problems';
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
        return `${baseUrl}/internal-error`;
      default:
        return `${baseUrl}/generic-error`;
    }
  }
}