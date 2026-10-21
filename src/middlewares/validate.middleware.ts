import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Express middleware that validates incoming request payloads against a Zod schema.
 * Rejects invalid, malformed, or injected fields before hitting controllers or database queries.
 */
export const validateBody = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        const issues = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message
        }));

        res.status(400).json({
          success: false,
          error: issues.length === 1 ? issues[0].message : 'Validation failed for request payload',
          details: issues
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: 'Malformed request payload'
      });
    }
  };
};

/**
 * Express middleware to validate query parameters.
 */
export const validateQuery = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        const issues = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message
        }));

        res.status(400).json({
          success: false,
          error: issues.length === 1 ? issues[0].message : 'Validation failed for query parameters',
          details: issues
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: 'Malformed query parameters'
      });
    }
  };
};
