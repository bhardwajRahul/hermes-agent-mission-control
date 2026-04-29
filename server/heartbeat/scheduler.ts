import type { AgentAdapter } from '../adapters/types.js';
import { getHeartbeatSettings } from '../db/queries.js';
import { runHeartbeat } from './runner.js';

let adapter: AgentAdapter | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let stopped = true;

function scheduleNext(): void {
  if (timer) clearTimeout(timer);
  if (!adapter || stopped) return;
  const ms = getHeartbeatSettings().intervalMinutes * 60_000;
  timer = setTimeout(() => {
    timer = null;
    if (!adapter || stopped) return;
    runHeartbeat(adapter)
      .catch((err) => console.error('[heartbeat] scheduled run error:', err))
      .finally(() => scheduleNext());
  }, ms);
}

export function startHeartbeatScheduler(agentAdapter: AgentAdapter): void {
  stopHeartbeatScheduler();
  adapter = agentAdapter;
  stopped = false;
  scheduleNext();
}

export function stopHeartbeatScheduler(): void {
  stopped = true;
  if (timer) clearTimeout(timer);
  timer = null;
  adapter = null;
}

export function rescheduleHeartbeatScheduler(): void {
  if (!stopped) scheduleNext();
}
