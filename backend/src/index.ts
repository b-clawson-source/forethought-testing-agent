import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';

import testsRoutes from './routes/tests';
import conversationsRoutes from './routes/conversations'; // keep your existing basic engine
// import other routes as needed…

const app = express();

// --- middleware ---
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// --- simple health/debug ---
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    ts: new Date().toISOString(),
    hasWidgetKey: !!process.env.FORETHOUGHT_WIDGET_API_KEY
  });
});

// (optional) quick debug endpoint to verify env + mode
app.get('/api/debug/mode', (_req, res) => {
  res.json({
    mode: process.env.FORETHOUGHT_MODE ?? 'widget',
    hasWidgetKey: !!process.env.FORETHOUGHT_WIDGET_API_KEY,
    replyTimeoutMs: Number(process.env.FT_REPLY_TIMEOUT_MS ?? 9000),
    headless: String(process.env.PLAYWRIGHT_HEADLESS ?? 'true')
  });
});

// --- mount routers ---
// basic “toy” conversation engine (what you saw earlier in logs)
app.use('/api/conversations', conversationsRoutes);

// **Autonomous Forethought runner (Playwright/widget-backed)**
app.use('/api/tests', testsRoutes);

// --- startup ---
const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📋 Health: http://localhost:${port}/health`);
  console.log(`🧪 Tests API (autonomous): POST http://localhost:${port}/api/tests/run-once`);
  console.log(`🧪 Tests API (cycle):      POST http://localhost:${port}/api/tests/start`);
  console.log(`🔎 Debug: http://localhost:${port}/api/debug/mode`);
});