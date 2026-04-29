import { useEffect, useState, useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { fetchHeartbeatLogs } from '../lib/api';
import { STATUS_META } from '../lib/constants';
import type { HeartbeatLogEntry, TaskStatus } from '@shared/types';
import { formatDate } from '../lib/format';

const ACTION_LABELS: Record<HeartbeatLogEntry['action'], { label: string; fromStatus: TaskStatus; toStatus: TaskStatus } | null> = {
  check: null,
  move_blocked: { label: 'Automatic check-in moved this task', fromStatus: 'in_progress', toStatus: 'blocked' },
  move_in_review: { label: 'Automatic check-in moved this task', fromStatus: 'in_progress', toStatus: 'in_review' },
};

interface ActivityItem {
  id: string;
  kind: 'status_change' | 'check_in' | 'report';
  created_at: number;
  logEntry?: HeartbeatLogEntry;
}

function parseDetails(details: string | null): Record<string, unknown> {
  if (!details) return {};
  try { return JSON.parse(details); } catch { return {}; }
}

export function TaskActivity({ taskId }: { taskId: string }) {
  const [logs, setLogs] = useState<HeartbeatLogEntry[]>([]);

  useEffect(() => {
    fetchHeartbeatLogs(taskId)
      .then(({ logs: l }) => setLogs(l))
      .catch(() => setLogs([]));
  }, [taskId]);

  const items = useMemo(() => {
    const result: ActivityItem[] = [];

    for (const log of logs) {
      const transition = ACTION_LABELS[log.action];
      if (transition) {
        result.push({ id: log.id, kind: 'status_change', created_at: log.created_at, logEntry: log });
      } else {
        result.push({ id: log.id, kind: 'check_in', created_at: log.created_at, logEntry: log });
      }
    }

    result.sort((a, b) => b.created_at - a.created_at);
    return result;
  }, [logs]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
      <div className="mx-auto w-full max-w-[760px]">
        {items.length === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-12">
            No activity yet. Automatic check-ins will appear here.
          </p>
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const details = item.logEntry ? parseDetails(item.logEntry.details) : {};
  const summary = (details.summary as string) || null;
  const userSummary = (details.user_summary as string) || null;
  const transition = item.logEntry ? ACTION_LABELS[item.logEntry.action] : null;
  const detailText = userSummary || summary;

  return (
    <div className="py-3 group">
      <div className="flex items-start gap-3">
        <div className="mt-1.5 shrink-0">
          {transition ? (
            <span className="flex w-5 h-5 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <ArrowRight size={12} className="text-zinc-500" />
            </span>
          ) : (
            <span className="flex w-5 h-5 items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {transition ? (
              <>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {transition.label}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[transition.fromStatus].color}`} />
                  {STATUS_META[transition.fromStatus].label}
                  <ArrowRight size={10} className="text-zinc-400" />
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[transition.toStatus].color}`} />
                  {STATUS_META[transition.toStatus].label}
                </span>
              </>
            ) : (
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Automatic check-in
              </span>
            )}
            <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-auto shrink-0">
              {formatDate(item.created_at)}
            </span>
          </div>

          {detailText && (
            <p className={`mt-1.5 whitespace-pre-wrap leading-relaxed ${
              userSummary || transition
                ? 'text-sm text-zinc-700 dark:text-zinc-300'
                : 'text-xs text-zinc-400 dark:text-zinc-500'
            }`}>
              {transition && !userSummary ? `Reason: ${detailText}` : detailText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
