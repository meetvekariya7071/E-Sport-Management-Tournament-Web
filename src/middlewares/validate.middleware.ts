import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

/**
 * Validates incoming request (body, query, params) against a Zod schema.
 * Rejects invalid payloads with 400 Bad Request and structured error details.
 */
export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });

      // Replace with sanitized/validated data
      req.body = parsed.body ?? req.body;
      req.query = parsed.query ?? req.query;
      req.params = parsed.params ?? req.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.errors.map((err) => ({
          field: err.path.slice(1).join('.'),
          message: err.message
        }));

        res.status(400).json({
          success: false,
          error: 'Validation failed: ' + issues.map((i) => `${i.field || 'payload'}: ${i.message}`).join(', '),
          validationErrors: issues
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: 'Malformed request payload.'
      });
    }
  };
};
