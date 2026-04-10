/**
 * CrisisGuard AI - Health Check Controller
 * Returns system health status with uptime and memory metrics.
 */

import { Request, Response } from 'express';
import { config } from '../config/environment.js';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  uptime: number;
  timestamp: string;
  environment: string;
  memory: {
    usedMB: number;
    totalMB: number;
    percentage: number;
  };
  dependencies: {
    firebase: 'connected' | 'disconnected' | 'unknown';
    redis: 'connected' | 'disconnected' | 'unknown';
  };
}

export class HealthController {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  public check = async (_req: Request, res: Response): Promise<void> => {
    const memUsage = process.memoryUsage();
    const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    const health: HealthStatus = {
      status: 'healthy',
      service: 'api-gateway',
      version: config.apiVersion,
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      memory: {
        usedMB,
        totalMB,
        percentage: Math.round((usedMB / totalMB) * 100),
      },
      dependencies: {
        firebase: 'unknown',
        redis: 'unknown',
      },
    };

    // Memory threshold check — flag degraded if using >90%
    if (health.memory.percentage > 90) {
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json({
      success: true,
      data: health,
      meta: {
        timestamp: health.timestamp,
        requestId: _req.requestId,
        version: config.apiVersion,
      },
    });
  };

  public readiness = async (_req: Request, res: Response): Promise<void> => {
    // Kubernetes readiness probe - checks if service can accept traffic
    res.status(200).json({
      success: true,
      data: { ready: true },
    });
  };

  public liveness = async (_req: Request, res: Response): Promise<void> => {
    // Kubernetes liveness probe - checks if process is alive
    res.status(200).json({
      success: true,
      data: { alive: true },
    });
  };
}
