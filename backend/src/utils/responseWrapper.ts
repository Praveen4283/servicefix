import { Response } from 'express';

/**
 * Standard API response format
 */
interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  code?: string;
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: any;
  };
}

/**
 * Pagination options for list responses
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  total: number;
}

/**
 * Wrapper for successful responses
 * @param res Express response object
 * @param data Data to return to the client
 * @param message Optional success message
 * @param statusCode HTTP status code (default: 200)
 * @param pagination Optional pagination metadata
 * @returns Express response
 */
export const success = <T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode = 200,
  pagination?: PaginationOptions
): Response => {
  const response: ApiResponse<T> = {
    status: 'success',
    ...(message && { message }),
    ...(data !== undefined && { data })
  };

  // Add pagination metadata if provided
  if (pagination) {
    const { page, limit, total } = pagination;
    const totalPages = Math.ceil(total / limit);
    
    response.metadata = {
      page,
      limit,
      total,
      totalPages
    };
  }

  return res.status(statusCode).json(response);
};

/**
 * Wrapper for error responses
 * @param res Express response object
 * @param message Error message
 * @param statusCode HTTP status code (default: 400)
 * @param code Optional error code for the client
 * @returns Express response
 */
export const error = (
  res: Response,
  message: string,
  statusCode = 400,
  code?: string
): Response => {
  const response: ApiResponse<null> = {
    status: 'error',
    message,
    ...(code && { code })
  };

  return res.status(statusCode).json(response);
};

/**
 * Wrapper for no content responses (HTTP 204)
 * @param res Express response object
 * @returns Express response
 */
export const noContent = (res: Response): Response => {
  return res.status(204).send();
};

/**
 * Wrapper for created responses (HTTP 201)
 * @param res Express response object
 * @param data Data to return to the client
 * @param message Optional success message
 * @returns Express response
 */
export const created = <T>(
  res: Response,
  data?: T,
  message = 'Resource created successfully'
): Response => {
  return success(res, data, message, 201);
};

export default {
  success,
  error,
  noContent,
  created
}; 