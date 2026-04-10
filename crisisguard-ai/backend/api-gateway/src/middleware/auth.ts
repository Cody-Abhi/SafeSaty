/**
 * CrisisGuard AI - Authentication Middleware
 * Verifies Firebase JWT tokens and enforces role-based access control.
 */

import { Request, Response, NextFunction } from 'express';
import { getAuth } from '../config/firebase.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

// Extend Express Request with auth context
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        name?: string;
        role: string;
        propertyId?: string;
      };
    }
  }
}

/**
 * Verifies Firebase ID token from Authorization header.
 * Token format: "Bearer <firebase-id-token>"
 */
export async function verifyToken(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header. Expected: Bearer <token>');
    }

    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);

    // Attach user context to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: (decodedToken.role as string) || 'guest',
      propertyId: decodedToken.propertyId as string | undefined,
    };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
      return;
    }

    logger.warn('Token verification failed', {
      requestId: req.requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    next(new UnauthorizedError('Invalid or expired token'));
  }
}

/**
 * Factory function: creates middleware that checks if user has required role.
 * Usage: requireRole('admin') or requireRole('staff', 'admin')
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Access denied - insufficient role', {
        requestId: req.requestId,
        uid: req.user.uid,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
      });
      next(new ForbiddenError(`Access denied. Required roles: ${allowedRoles.join(', ')}`));
      return;
    }

    next();
  };
}

/**
 * Checks if the requesting user is accessing their own resource or is an admin.
 */
export function requireSelfOrAdmin(uidParam = 'uid') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    const targetUid = req.params[uidParam];

    if (req.user.uid !== targetUid && req.user.role !== 'admin') {
      next(new ForbiddenError('You can only access your own resources'));
      return;
    }

    next();
  };
}
