import { Router } from 'express';
import { getTask } from '../db/queries.js';
import { toErrorMessage } from '../errors.js';
import { taskRunSettings } from '../agent-settings.js';
import type { AgentDefaults, Task, TaskAgentSettings } from '../../shared/types.js';
import type { HermesWorkerAdapter } from '../adapters/hermes-worker.js';

const FALLBACK_DEFAULTS: AgentDefaults = {
  provider: null,
  model: null,
  baseUrl: null,
  apiMode: null,
  reasoningEffort: 'medium',
  showReasoning: true,
};

async function defaultsForSettings(adapter: HermesWorkerAdapter): Promise<AgentDefaults> {
  try {
    return await adapter.getDefaults();
  } catch {
    return FALLBACK_DEFAULTS;
  }
}

function buildTaskSettings(task: Task, defaults: AgentDefaults): TaskAgentSettings {
  const overrides = taskRunSettings(task);
  return {
    task: {
      model: overrides.model ?? null,
      reasoningEffort: overrides.reasoningEffort ?? null,
    },
    defaults,
    effective: {
      model: overrides.model ?? defaults.model,
      provider: defaults.provider,
      reasoningEffort: overrides.reasoningEffort ?? defaults.reasoningEffort,
    },
  };
}

export function createAgentRouter(adapter: HermesWorkerAdapter): Router {
  const router = Router();

  router.get('/defaults', async (_req, res) => {
    try {
      res.json(await adapter.getDefaults());
    } catch (error) {
      res.status(503).json({ error: toErrorMessage(error, 'Hermes worker unavailable') });
    }
  });

  router.get('/models', async (_req, res) => {
    try {
      res.json(await adapter.getModels());
    } catch (error) {
      res.status(503).json({ error: toErrorMessage(error, 'Hermes worker unavailable') });
    }
  });

  return router;
}

export function createTaskAgentSettingsRouter(adapter: HermesWorkerAdapter): Router {
  const router = Router();

  router.get('/:id/agent-settings', async (req, res) => {
    const task = getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const defaults = await defaultsForSettings(adapter);
    res.json(buildTaskSettings(task, defaults));
  });

  return router;
}
