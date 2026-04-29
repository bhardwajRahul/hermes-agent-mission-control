import { Router } from 'express';
import type { AgentAdapter } from '../adapters/types.js';
import * as queries from '../db/queries.js';
import { getHeartbeatStatus, runHeartbeat } from '../heartbeat/runner.js';
import { rescheduleHeartbeatScheduler } from '../heartbeat/scheduler.js';
import { isRecord, toErrorMessage } from '../errors.js';

export function createHeartbeatRouter(adapter: AgentAdapter): Router {
  const router = Router();

  router.post('/trigger', (_req, res) => {
    if (getHeartbeatStatus().isRunning) {
      return res.json({ ok: false, message: 'heartbeat already running' });
    }
    runHeartbeat(adapter)
      .catch((err) => console.error('[heartbeat] trigger error:', err));
    res.json({ ok: true, message: 'heartbeat triggered' });
  });

  router.get('/log', (req, res) => {
    const taskId = req.query.task_id as string | undefined;
    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 50, 200));
    const logs = queries.getHeartbeatLogs(taskId, limit);
    res.json({ logs });
  });

  router.get('/status', (_req, res) => {
    res.json({ ...getHeartbeatStatus(), settings: queries.getHeartbeatSettings() });
  });

  router.get('/settings', (_req, res) => {
    res.json({ settings: queries.getHeartbeatSettings() });
  });

  router.patch('/settings', (req, res) => {
    if (!isRecord(req.body)) {
      return res.status(400).json({ error: 'settings body is required' });
    }

    try {
      const settings = queries.updateHeartbeatSettings({
        intervalMinutes: req.body.intervalMinutes as number | undefined,
        idleMinutes: req.body.idleMinutes as number | undefined,
      });
      rescheduleHeartbeatScheduler();
      res.json({ settings });
    } catch (error) {
      res.status(400).json({ error: toErrorMessage(error, 'Invalid heartbeat settings') });
    }
  });

  return router;
}
