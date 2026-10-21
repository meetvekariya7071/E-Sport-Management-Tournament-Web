export class AppError extends Error {
  public statusCode: number;
  public errorCode: string;
  public details: any;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_ERROR',
    details: any = null
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const formatErrorResponse = (
  message: string,
  errorCode: string = 'INTERNAL_ERROR',
  details: any = null
) => {
  return {
    success: false,
    message,
    errorCode,
    details
  };
};
