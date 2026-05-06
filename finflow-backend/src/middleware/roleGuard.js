'use strict';

/**
 * @module roleGuard
 * @description
 * Role-based access control (RBAC) middleware factory for FinFlow Pro.
 *
 * Checks req.user.role (set by the authenticate middleware) against
 * the list of allowed roles for the route.
 *
 * Supported roles: ADMIN, AGENT
 *
 * @example
 *   // Allow only admins
 *   router.get('/admin-only', authenticate, roleGuard('ADMIN'), handler);
 *
 *   // Allow admins or agents
 *   router.get('/shared', authenticate, roleGuard('ADMIN', 'AGENT'), handler);
 */

/**
 * Create a role-checking middleware.
 *
 * @param {...string} allowedRoles - One or more role strings.
 * @returns {import('express').RequestHandler} Express middleware.
 */
function roleGuard(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        errorCode: 'AUTH_REQUIRED',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${allowedRoles.join(', ')}.`,
        errorCode: 'INSUFFICIENT_ROLE',
      });
    }

    return next();
  };
}

module.exports = roleGuard;
