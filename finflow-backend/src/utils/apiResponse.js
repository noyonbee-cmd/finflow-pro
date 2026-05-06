'use strict';

/**
 * @module ApiResponse
 * @description
 * Standardised JSON response helpers for FinFlow Pro.
 *
 * Every endpoint MUST use these helpers to guarantee a consistent
 * response envelope across the platform.
 *
 * Envelope shape:
 *  {
 *    success: boolean,
 *    message: string,
 *    data: any,
 *    pagination?: { page, limit, total, totalPages },
 *    errorCode?: string,
 *    details?: any
 *  }
 */

class ApiResponse {
  /**
   * Send a success response.
   *
   * @param {import('express').Response} res - Express response object.
   * @param {*}      data       - Response payload.
   * @param {string} [message]  - Human-readable message.
   * @param {number} [statusCode] - HTTP status code (default 200).
   * @returns {void}
   */
  static success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * Send an error response.
   *
   * @param {import('express').Response} res - Express response object.
   * @param {string}  message    - Human-readable error message.
   * @param {number}  [statusCode] - HTTP status code (default 400).
   * @param {string}  [errorCode]  - Machine-readable error code.
   * @param {*}       [details]    - Additional error context.
   * @returns {void}
   */
  static error(res, message, statusCode = 400, errorCode = null, details = null) {
    const payload = {
      success: false,
      message,
    };

    if (errorCode) payload.errorCode = errorCode;
    if (details) payload.details = details;

    return res.status(statusCode).json(payload);
  }

  /**
   * Send a paginated success response.
   *
   * @param {import('express').Response} res - Express response object.
   * @param {*}      data    - Array of records.
   * @param {number} total   - Total records matching the query.
   * @param {number} page    - Current page number (1-indexed).
   * @param {number} limit   - Records per page.
   * @param {string} [message] - Human-readable message.
   * @returns {void}
   */
  static paginated(res, data, total, page, limit, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
}

module.exports = ApiResponse;
