import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public statusCode: number;
  public errorCode: string;
  public details: any;

  constructor(message: string, statusCode = 500, errorCode = 'INTERNAL_ERROR', details: any = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Endpoint '${req.method} ${req.originalUrl}' does not exist.`,
    error: `Endpoint '${req.method} ${req.originalUrl}' does not exist.`,
    errorCode: 'RESOURCE_NOT_FOUND',
    details: {
      method: req.method,
      path: req.originalUrl
    }
  });
};

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  let errorCode = err.errorCode;
  if (!errorCode) {
    if (statusCode === 404) errorCode = 'RESOURCE_NOT_FOUND';
    else if (statusCode === 403) errorCode = 'FORBIDDEN_ACCESS';
    else if (statusCode === 401) errorCode = 'UNAUTHORIZED';
    else if (statusCode === 400) errorCode = 'VALIDATION_ERROR';
    else if (statusCode === 409) errorCode = 'RESOURCE_CONFLICT';
    else errorCode = 'INTERNAL_SERVER_ERROR';
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: message,
    errorCode,
    details: err.details || null
  });
};
