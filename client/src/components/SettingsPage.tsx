import { useCallback, useEffect, useMemo, useState } from 'react';
import { Settings, Bot, Sun, Moon, Monitor, ChevronDown } from 'lucide-react';
import { useTheme, type ThemePreference } from '../hooks/useTheme';
import { fetchHeartbeatSettings, updateHeartbeatSettings } from '../lib/api';
import { toErrorMessage } from '../lib/format';
import {
  DEFAULT_HEARTBEAT_SETTINGS,
  MIN_HEARTBEAT_MINUTES,
  MAX_HEARTBEAT_MINUTES,
  type HeartbeatSettings,
} from '@shared/types';

const themeOptions: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

function toDraft(settings: HeartbeatSettings): Record<keyof HeartbeatSettings, string> {
  return {
    intervalMinutes: String(settings.intervalMinutes),
    idleMinutes: String(settings.idleMinutes),
  };
}

function parseMinute(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= MIN_HEARTBEAT_MINUTES && parsed <= MAX_HEARTBEAT_MINUTES ? parsed : null;
}

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [heartbeatSettings, setHeartbeatSettings] = useState<HeartbeatSettings>(DEFAULT_HEARTBEAT_SETTINGS);
  const [heartbeatDraft, setHeartbeatDraft] = useState(toDraft(DEFAULT_HEARTBEAT_SETTINGS));
  const [heartbeatError, setHeartbeatError] = useState<string | null>(null);
  const [isLoadingHeartbeat, setIsLoadingHeartbeat] = useState(true);
  const [savedHeartbeat, setSavedHeartbeat] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingHeartbeat(true);
    fetchHeartbeatSettings()
      .then(({ settings }) => {
        if (cancelled) return;
        setHeartbeatSettings(settings);
        setHeartbeatDraft(toDraft(settings));
        setHeartbeatError(null);
      })
      .catch((error) => {
        if (!cancelled) setHeartbeatError(toErrorMessage(error, 'Failed to load heartbeat settings'));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingHeartbeat(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLoadingHeartbeat) return;
    const intervalMinutes = parseMinute(heartbeatDraft.intervalMinutes);
    const idleMinutes = parseMinute(heartbeatDraft.idleMinutes);
    if (intervalMinutes === null || idleMinutes === null) return;
    if (intervalMinutes === heartbeatSettings.intervalMinutes && idleMinutes === heartbeatSettings.idleMinutes) return;

    const timer = setTimeout(async () => {
      try {
        const { settings } = await updateHeartbeatSettings({ intervalMinutes, idleMinutes });
        setHeartbeatSettings(settings);
        setHeartbeatDraft((current) => {
          if (current.intervalMinutes === String(intervalMinutes) && current.idleMinutes === String(idleMinutes)) {
            return toDraft(settings);
          }
          return current;
        });
        setHeartbeatError(null);
        setSavedHeartbeat(true);
      } catch (error) {
        setHeartbeatError(toErrorMessage(error, 'Failed to save'));
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [heartbeatDraft, heartbeatSettings, isLoadingHeartbeat]);

  useEffect(() => {
    if (!savedHeartbeat) return;
    const timer = setTimeout(() => setSavedHeartbeat(false), 2000);
    return () => clearTimeout(timer);
  }, [savedHeartbeat]);

  const updateHeartbeatDraftField = useCallback(
    (field: keyof HeartbeatSettings, value: string) => {
      setHeartbeatDraft((current) => ({ ...current, [field]: value }));
      setSavedHeartbeat(false);
      setHeartbeatError(null);
    },
    [],
  );

  const isDirty = useMemo(() => {
    if (isLoadingHeartbeat) return false;
    const interval = parseMinute(heartbeatDraft.intervalMinutes);
    const idle = parseMinute(heartbeatDraft.idleMinutes);
    if (interval === null || idle === null) return false;
    return interval !== heartbeatSettings.intervalMinutes || idle !== heartbeatSettings.idleMinutes;
  }, [heartbeatDraft, heartbeatSettings, isLoadingHeartbeat]);

  const statusText = heartbeatError
    ? heartbeatError
    : isDirty ? 'Saving...' : savedHeartbeat ? 'Saved' : null;
  const statusVisible = statusText !== null;

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-2xl space-y-5">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-2">Adapter type</h2>
          <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1 gap-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
              <Bot size={14} />
              Hermes
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 dark:text-zinc-500 cursor-not-allowed">
              <Settings size={14} />
              OpenClaw
              <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500">Soon</span>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-2">Theme</h2>
          <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1 gap-1">
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  theme === value
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <section
          aria-labelledby="automatic-check-ins-title"
          className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id="automatic-check-ins-title" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Automatic check-ins
              </h2>
              <p className="mt-1 text-sm leading-5 text-zinc-500 dark:text-zinc-400">
                Checks idle in-progress tasks and asks agents to keep going when they can.
              </p>
            </div>
            <span
              aria-live="polite"
              aria-hidden={!statusVisible}
              className={`shrink-0 text-xs transition-opacity duration-300 ${
                statusVisible ? 'opacity-100' : 'opacity-0'
              } ${heartbeatError ? 'text-red-500' : 'text-zinc-400 dark:text-zinc-500'}`}
            >
              {statusText || 'Saved'}
            </span>
          </div>

          <div className="mt-5 flex items-baseline flex-wrap gap-x-1.5 gap-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <span>Every</span>
            <input
              type="number"
              min={MIN_HEARTBEAT_MINUTES}
              max={MAX_HEARTBEAT_MINUTES}
              step={1}
              value={heartbeatDraft.intervalMinutes}
              disabled={isLoadingHeartbeat}
              onChange={(event) => updateHeartbeatDraftField('intervalMinutes', event.target.value)}
              aria-label="Check every minutes"
              className="w-16 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-0.5 text-center text-sm tabular-nums text-zinc-900 dark:text-zinc-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-700 disabled:opacity-50"
            />
            <span>min, check for in-progress tasks idle longer than</span>
            <input
              type="number"
              min={MIN_HEARTBEAT_MINUTES}
              max={MAX_HEARTBEAT_MINUTES}
              step={1}
              value={heartbeatDraft.idleMinutes}
              disabled={isLoadingHeartbeat}
              onChange={(event) => updateHeartbeatDraftField('idleMinutes', event.target.value)}
              aria-label="Idle threshold minutes"
              className="w-16 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-0.5 text-center text-sm tabular-nums text-zinc-900 dark:text-zinc-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-700 disabled:opacity-50"
            />
            <span>min.</span>
          </div>

          <details className="group/checkin mt-4">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 [&::-webkit-details-marker]:hidden">
              <ChevronDown size={14} className="shrink-0 transition-transform group-open/checkin:rotate-180" />
              How check-ins work
            </summary>
            <p className="mt-2 pl-5 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Automatic check-ins are sent only to in-progress tasks that have been idle longer than your threshold.
              During a check-in, the agent is asked to keep going if it can, make reasonable assumptions instead of
              waiting, try another approach if stuck, and report whether it is still progressing, ready for review, or
              blocked.
            </p>
          </details>
        </section>
      </div>
    </div>
  );
}
