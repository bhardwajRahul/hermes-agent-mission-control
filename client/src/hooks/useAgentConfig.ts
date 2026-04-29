import { useState, useEffect, useRef } from 'react';
import { fetchAgentDefaults, fetchAgentModels, fetchTaskAgentSettings } from '../lib/api';
import type { AgentRunSettings } from '../lib/api';
import type { AgentDefaults, AgentModelGroup, ReasoningEffort } from '@shared/types';

export function useAgentConfig(taskId?: string, initialSettings?: AgentRunSettings) {
  const [defaults, setDefaults] = useState<AgentDefaults | null>(null);
  const [modelGroups, setModelGroups] = useState<AgentModelGroup[]>([]);
  const [model, setModel] = useState<string | null>(initialSettings?.model ?? null);
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort | null>(initialSettings?.reasoningEffort ?? null);
  const initialRef = useRef(initialSettings);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      taskId ? fetchTaskAgentSettings(taskId) : fetchAgentDefaults(),
      fetchAgentModels(),
    ]).then(([settingsResult, modelsResult]) => {
      if (cancelled) return;
      if (settingsResult.status === 'fulfilled') {
        const val = settingsResult.value;
        if ('task' in val) {
          setDefaults(val.defaults);
          setModel(val.task.model ?? initialRef.current?.model ?? null);
          setReasoningEffort(val.task.reasoningEffort ?? initialRef.current?.reasoningEffort ?? null);
        } else {
          setDefaults(val);
        }
      }
      if (modelsResult.status === 'fulfilled') {
        setModelGroups(modelsResult.value.groups);
      }
    });
    return () => { cancelled = true; };
  }, [taskId]);

  return { defaults, modelGroups, model, setModel, reasoningEffort, setReasoningEffort };
}
