/**
 * CrisisGuard AI - Auth Controller
 * Handles authentication and user management endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { UserService, CreateUserData } from '../services/user.service.js';
import { BadRequestError } from '../utils/errors.js';
import { config } from '../config/environment.js';

export class AuthController {
  private userService: UserService;

  constructor(userService?: UserService) {
    this.userService = userService || new UserService();
  }

  /**
   * POST /api/v1/auth/register
   * Registers a new user and creates Firestore profile.
   */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { uid, email, displayName, phone, role, propertyId, locale, staffRole, certifications, zoneAssignment } = req.body;

      if (!uid || !email || !displayName) {
        throw new BadRequestError('Missing required fields: uid, email, displayName');
      }

      const validRoles = ['guest', 'staff', 'admin'];
      const userRole = role || 'guest';
      if (!validRoles.includes(userRole)) {
        throw new BadRequestError(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }

      const createData: CreateUserData = {
        uid,
        email,
        displayName,
        phone,
        role: userRole,
        propertyId,
        locale,
        staffRole,
        certifications,
        zoneAssignment,
      };

      const user = await this.userService.createUser(createData);

      res.status(201).json({
        success: true,
        data: { user },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
          version: config.apiVersion,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/auth/login
   * Validates Firebase token and returns user profile.
   * The actual JWT creation happens on the client via Firebase SDK.
   * This endpoint verifies the token and returns server-side profile data.
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('Authentication required');
      }

      const user = await this.userService.getUserById(req.user.uid);

      // Register FCM token if provided
      const { fcmToken } = req.body;
      if (fcmToken) {
        await this.userService.addFcmToken(req.user.uid, fcmToken);
      }

      res.status(200).json({
        success: true,
        data: { user },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
          version: config.apiVersion,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/auth/profile
   * Returns the current user's profile.
   */
  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('Authentication required');
      }

      const user = await this.userService.getUserById(req.user.uid);

      res.status(200).json({
        success: true,
        data: { user },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
          version: config.apiVersion,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/auth/profile
   * Updates the current user's profile.
   */
  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('Authentication required');
      }

      const allowedFields = [
        'displayName', 'phone', 'locale', 'status',
        'staffRole', 'certifications', 'zoneAssignment',
        'lastLocation', 'lastLocationFloor',
      ];

      const updateData: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      if (Object.keys(updateData).length === 0) {
        throw new BadRequestError('No valid fields to update');
      }

      const user = await this.userService.updateUser(req.user.uid, updateData);

      res.status(200).json({
        success: true,
        data: { user },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
          version: config.apiVersion,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/auth/assign-role
   * Admin-only: assigns a role to a user.
   */
  assignRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { uid, role } = req.body;

      if (!uid || !role) {
        throw new BadRequestError('Missing required fields: uid, role');
      }

      await this.userService.assignRole(uid, role);

      res.status(200).json({
        success: true,
        data: { message: `Role '${role}' assigned to user ${uid}` },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
          version: config.apiVersion,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/auth/account
   * GDPR: Deletes current user's account and all associated data.
   */
  deleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('Authentication required');
      }

      await this.userService.deleteUser(req.user.uid);

      res.status(200).json({
        success: true,
        data: { message: 'Account deleted successfully' },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
          version: config.apiVersion,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
