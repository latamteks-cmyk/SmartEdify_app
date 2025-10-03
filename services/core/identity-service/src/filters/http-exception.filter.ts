import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  [key: string]: any; // Extension members
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Log the error for debugging
    this.logger.error(
      `Error occurred for ${request.method} ${request.url}: ${
        exception instanceof Error ? exception.message : 'Unknown error'
      }`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // Create RFC 7807 Problem Details object
    const problemDetails: ProblemDetails = {
      type: this.getProblemType(status),
      title: this.getProblemTitle(status),
      status: status,
      instance: `${request.method} ${request.url}`,
    };

    // Add additional details for specific error types
    if (exception instanceof HttpException) {
      const responseObject = exception.getResponse();
      
      if (typeof responseObject === 'string') {
        problemDetails.detail = responseObject;
      } else if (typeof responseObject === 'object' && responseObject !== null) {
        // If it's already a Problem Details object, use it
        if ('type' in responseObject && 'title' in responseObject) {
          Object.assign(problemDetails, responseObject);
        } else {
          // Otherwise, treat it as error details
          problemDetails.detail = (responseObject as any).message || JSON.stringify(responseObject);
          
          // Add any additional fields from the response
          Object.keys(responseObject).forEach(key => {
            if (!['type', 'title', 'status', 'detail', 'instance'].includes(key)) {
              problemDetails[key] = (responseObject as any)[key];
            }
          });
        }
      }
    } else if (exception instanceof Error) {
      problemDetails.detail = exception.message;
    }

    // Send the RFC 7807 formatted response with proper content type
    response
      .status(status)
      .set('Content-Type', 'application/problem+json')
      .json(problemDetails);
  }

  private getProblemType(status: number): string {
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
        return `${baseUrl}/unprocessable-entity`;
      case HttpStatus.TOO_MANY_REQUESTS:
        return `${baseUrl}/too-many-requests`;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return `${baseUrl}/internal-server-error`;
      default:
        return `${baseUrl}/error`;
    }
  }

  private getProblemTitle(status: number): string {
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
}