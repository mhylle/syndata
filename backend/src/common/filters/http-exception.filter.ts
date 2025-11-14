import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  filterSensitiveData,
  extractSafeRequestData,
} from '../utils/sensitive-data-filter.util';

/**
 * Standardized error response interface
 */
export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  timestamp: string;
  path: string;
  error?: string;
}

/**
 * Global HTTP exception filter that standardizes all error responses
 * and logs errors with sensitive data filtering
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status code and error message
    const { status, message, errorName } = this.extractExceptionData(exception);

    // Build standardized error response
    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Add error name for non-validation errors
    if (errorName && status >= 500) {
      errorResponse.error = errorName;
    }

    // Log the error with appropriate level and safe request data
    this.logError(exception, status, request);

    // Send response
    response.status(status).json(errorResponse);
  }

  /**
   * Extracts status code, message, and error name from exception
   */
  private extractExceptionData(exception: unknown): {
    status: number;
    message: string | string[];
    errorName?: string;
  } {
    // Handle HttpException and its subclasses
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      // Extract message from response
      let message: string | string[];
      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        const responseObj = response as any;
        message = responseObj.message || responseObj.error || exception.message;
      } else {
        message = exception.message;
      }

      return {
        status,
        message,
        errorName:
          exception.name !== 'HttpException' ? exception.name : undefined,
      };
    }

    // Handle Error instances
    if (exception instanceof Error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        errorName: exception.name,
      };
    }

    // Handle unknown exceptions
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      errorName: 'UnknownError',
    };
  }

  /**
   * Logs error with appropriate level and safe request data
   */
  private logError(exception: unknown, status: number, request: Request): void {
    // Determine log level based on status code
    const logLevel = status >= 500 ? 'error' : 'warn';

    // Extract safe request data
    const safeRequest = extractSafeRequestData(request);

    // Build log context
    const logContext: any = {
      statusCode: status,
      method: request.method,
      path: request.url,
      ip: request.ip,
      userAgent: request.get('user-agent'),
      timestamp: new Date().toISOString(),
    };

    // Add exception details
    if (exception instanceof Error) {
      logContext.error = {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
      };
    } else {
      logContext.error = {
        type: typeof exception,
        value: filterSensitiveData(exception),
      };
    }

    // Add filtered request body and query for client errors (4xx)
    if (status >= 400 && status < 500) {
      logContext.request = {
        body: filterSensitiveData(request.body),
        query: filterSensitiveData(request.query),
        params: request.params,
      };
    }

    // Log with appropriate level using Winston logger
    const errorMessage = `HTTP ${status} ${logLevel === 'error' ? 'Error' : 'Warning'}: ${exception instanceof Error ? exception.message : 'Unknown error'}`;
    const metadata = {
      context: 'HttpExceptionFilter',
      ...logContext,
    };

    if (logLevel === 'error') {
      // Add stack to metadata for errors
      metadata.stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(errorMessage, metadata);
    } else {
      this.logger.warn(errorMessage, metadata);
    }
  }
}
