/**
 * CrisisGuard AI - Emergency Services Gateway
 * External integration layer: CAD dispatch, NG911, telephony fallback.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { cadRouter } from './integrations/cad';
import { ng911Router } from './integrations/ng911';
import { telephonyRouter } from './integrations/telephony';

const PORT = process.env.PORT || 3005;

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// ─── Health ──────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      service: 'emergency-services-gateway',
      status: 'healthy',
      version: '1.0.0',
      integrations: {
        cad: 'ready',
        ng911: 'ready',
        telephony: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'unconfigured',
      },
    },
  });
});

// ─── Routes ──────────────────────────────────────────────────
app.use('/api/external/cad', cadRouter);
app.use('/api/external/ng911', ng911Router);
app.use('/api/external/telephony', telephonyRouter);

app.listen(PORT, () => {
  console.log(`[emergency-services-gateway] running on :${PORT}`);
});

export default app;
