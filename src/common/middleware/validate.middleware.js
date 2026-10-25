import { ValidationError } from '../errors/app.error.js';

/**
 * Zod validation middleware factory
 * @param {{ body?: import('zod').ZodTypeAny, query?: import('zod').ZodTypeAny, params?: import('zod').ZodTypeAny }} schemas
 */
export const validate = schemas => async (req, res, next) => {
  try {
    if (schemas.body) {
      req.body = await schemas.body.parseAsync(req.body);
    }
    if (schemas.query) {
      req.query = await schemas.query.parseAsync(req.query);
    }
    if (schemas.params) {
      req.params = await schemas.params.parseAsync(req.params);
    }
    next();
  } catch (error) {
    if (error.errors && Array.isArray(error.errors)) {
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return next(new ValidationError('Request validation failed', formattedErrors));
    }
    next(error);
  }
};
