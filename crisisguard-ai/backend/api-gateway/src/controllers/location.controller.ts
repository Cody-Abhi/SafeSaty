/**
 * CrisisGuard AI - Location Controller
 * REST endpoints for location tracking and zone queries.
 */

import { Request, Response, NextFunction } from 'express';
import { LocationService } from '../services/location.service.js';
import { BadRequestError } from '../utils/errors.js';

const locationService = new LocationService();

export class LocationController {
  /**
   * POST /api/location/update
   * Update authenticated user's location.
   */
  static async updateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        throw new BadRequestError('User not authenticated');
      }

      const { latitude, longitude, floor, zone, accuracy, heading, speed, batteryLevel } = req.body;

      if (latitude == null || longitude == null || floor == null || !zone) {
        throw new BadRequestError('Missing required fields: latitude, longitude, floor, zone');
      }

      await locationService.updateLocation({
        uid,
        propertyId: req.user?.propertyId || req.body.propertyId,
        latitude: Number(latitude),
        longitude: Number(longitude),
        floor: Number(floor),
        zone: String(zone),
        accuracy: accuracy != null ? Number(accuracy) : undefined,
        heading: heading != null ? Number(heading) : undefined,
        speed: speed != null ? Number(speed) : undefined,
        batteryLevel: batteryLevel != null ? Number(batteryLevel) : undefined,
        timestamp: new Date().toISOString(),
      });

      res.status(200).json({
        success: true,
        message: 'Location updated',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/location/me
   * Get own current location.
   */
  static async getMyLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid = req.user?.uid;
      if (!uid) throw new BadRequestError('User not authenticated');

      const location = await locationService.getUserLocation(uid);
      res.json({ success: true, data: location });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/location/zone/:zone
   * Get all users in a zone (staff/admin only).
   */
  static async getZoneOccupants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const propertyId = req.user?.propertyId || (req.query['propertyId'] as string);
      const zone = req.params['zone'] as string;
      const floor = req.query['floor'] ? Number(req.query['floor']) : undefined;

      if (!propertyId || !zone) {
        throw new BadRequestError('Missing propertyId or zone');
      }

      const occupancy = await locationService.getZoneOccupants(propertyId, zone, floor);
      res.json({ success: true, data: occupancy });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/location/floor/:floor
   * Get all users on a floor (staff/admin only).
   */
  static async getFloorOccupants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const propertyId = req.user?.propertyId || (req.query['propertyId'] as string);
      const floor = Number(req.params['floor']);

      if (!propertyId || isNaN(floor)) {
        throw new BadRequestError('Missing propertyId or invalid floor');
      }

      const occupants = await locationService.getFloorOccupants(propertyId, floor);
      res.json({ success: true, data: occupants });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/location/headcount
   * Get property headcount by floor (admin only).
   */
  static async getHeadcount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const propertyId = req.user?.propertyId || (req.query['propertyId'] as string);
      if (!propertyId) throw new BadRequestError('Missing propertyId');

      const headcount = await locationService.getPropertyHeadcount(propertyId);
      res.json({ success: true, data: headcount });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/location/history/:uid
   * Get user's recent location trail (admin/self only).
   */
  static async getUserHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid = req.params['uid'] as string;
      const minutes = req.query['minutes'] ? Number(req.query['minutes']) : 30;

      const history = await locationService.getUserHistory(uid, minutes);
      res.json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  }
}
