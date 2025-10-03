import { HttpException, HttpStatus } from '@nestjs/common';
import { ProblemDetails } from '../filters/http-exception.filter';

export class Rfc7807Exception extends HttpException {
  constructor(
    problemDetails: Omit<ProblemDetails, 'status'> & { status?: number },
    status?: number,
  ) {
    // Use the status from problemDetails if provided, otherwise use the status parameter
    const statusCode = problemDetails.status || status || HttpStatus.INTERNAL_SERVER_ERROR;
    
    // Remove the status property from problemDetails to avoid duplication
    const { status: _, ...detailsWithoutStatus } = problemDetails;
    
    super(detailsWithoutStatus, statusCode);
  }
  
  static badRequest(detail?: string, instance?: string): Rfc7807Exception {
    return new Rfc7807Exception({
      type: 'https://smartedify.global/problems/bad-request',
      title: 'Bad Request',
      detail,
      instance,
    }, HttpStatus.BAD_REQUEST);
  }
  
  static unauthorized(detail?: string, instance?: string): Rfc7807Exception {
    return new Rfc7807Exception({
      type: 'https://smartedify.global/problems/unauthorized',
      title: 'Unauthorized',
      detail,
      instance,
    }, HttpStatus.UNAUTHORIZED);
  }
  
  static forbidden(detail?: string, instance?: string): Rfc7807Exception {
    return new Rfc7807Exception({
      type: 'https://smartedify.global/problems/forbidden',
      title: 'Forbidden',
      detail,
      instance,
    }, HttpStatus.FORBIDDEN);
  }
  
  static notFound(detail?: string, instance?: string): Rfc7807Exception {
    return new Rfc7807Exception({
      type: 'https://smartedify.global/problems/not-found',
      title: 'Not Found',
      detail,
      instance,
    }, HttpStatus.NOT_FOUND);
  }
  
  static conflict(detail?: string, instance?: string): Rfc7807Exception {
    return new Rfc7807Exception({
      type: 'https://smartedify.global/problems/conflict',
      title: 'Conflict',
      detail,
      instance,
    }, HttpStatus.CONFLICT);
  }
  
  static unprocessableEntity(detail?: string, instance?: string): Rfc7807Exception {
    return new Rfc7807Exception({
      type: 'https://smartedify.global/problems/unprocessable-entity',
      title: 'Unprocessable Entity',
      detail,
      instance,
    }, HttpStatus.UNPROCESSABLE_ENTITY);
  }
  
  static tooManyRequests(detail?: string, instance?: string): Rfc7807Exception {
    return new Rfc7807Exception({
      type: 'https://smartedify.global/problems/too-many-requests',
      title: 'Too Many Requests',
      detail,
      instance,
    }, HttpStatus.TOO_MANY_REQUESTS);
  }
  
  static internalServerError(detail?: string, instance?: string): Rfc7807Exception {
    return new Rfc7807Exception({
      type: 'https://smartedify.global/problems/internal-server-error',
      title: 'Internal Server Error',
      detail,
      instance,
    }, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}