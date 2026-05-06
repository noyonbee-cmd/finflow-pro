'use strict';

/**
 * @module validate
 * @description
 * Joi validation middleware factory for FinFlow Pro.
 *
 * Creates Express middleware that validates `req.body` (or `req.query`/`req.params`)
 * against a Joi schema. On failure, returns a 422 response with field-level errors.
 *
 * @example
 *   const Joi = require('joi');
 *   const { validate } = require('../middleware/validate');
 *
 *   const createClientSchema = Joi.object({
 *     name: Joi.string().required(),
 *     phone: Joi.string().pattern(/^\+?[0-9]{10,15}$/).required(),
 *   });
 *
 *   router.post('/clients', validate(createClientSchema), clientController.create);
 */

/**
 * Returns an Express middleware that validates the specified request property
 * against the given Joi schema.
 *
 * @param {import('joi').ObjectSchema} schema - Joi schema to validate against.
 * @param {'body'|'query'|'params'} [source='body'] - Request property to validate.
 * @returns {import('express').RequestHandler} Express middleware.
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    if (!schema || typeof schema.validate !== 'function') {
      return next(new Error('validate() requires a valid Joi schema'));
    }

    const dataToValidate = req[source];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,       // Collect ALL errors, not just the first
      stripUnknown: true,      // Remove fields not in the schema
      convert: true,           // Allow type coercion (string → number etc.)
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
        type: detail.type,
      }));

      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errorCode: 'VALIDATION_ERROR',
        details,
      });
    }

    // Replace raw input with sanitized/coerced value
    req[source] = value;
    return next();
  };
}

module.exports = { validate };
