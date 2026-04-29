export const TASK_STATUSES = ['in_progress', 'blocked', 'in_review', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const REASONING_EFFORTS = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'] as const;
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

export interface AgentRunSettings {
  model?: string | null;
  reasoningEffort?: ReasoningEffort | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  agent_model: string | null;
  reasoning_effort: ReasoningEffort | null;
  created_at: number;
  updated_at: number;
  last_agent_response_at: number | null;
}

export interface TaskMessage {
  id: string;
  task_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string;
  usage?: UsageStats;
  created_at: number;
}

export interface ToolProgressEvent {
  tool: string;
  status: 'running' | 'completed' | 'error';
  duration?: number;
  label?: string;
}

export type LiveChatRunStatus = 'streaming' | 'done' | 'error';

export type LiveChatMessage = TaskMessage & { tools?: ToolProgressEvent[] };

export interface LiveChatRun {
  taskId: string;
  runId: string;
  sessionId: string;
  status: LiveChatRunStatus;
  startedAt: number;
  updatedAt: number;
  messages: LiveChatMessage[];
  usage?: UsageStats;
  error?: string;
}

export interface HeartbeatLogEntry {
  id: string;
  task_id: string;
  action: 'check' | 'move_blocked' | 'move_in_review';
  details: string | null;
  created_at: number;
}

export interface HeartbeatSettings {
  intervalMinutes: number;
  idleMinutes: number;
}

export const DEFAULT_HEARTBEAT_SETTINGS: HeartbeatSettings = {
  intervalMinutes: 15,
  idleMinutes: 15,
};
export const MIN_HEARTBEAT_MINUTES = 1;
export const MAX_HEARTBEAT_MINUTES = 24 * 60;

export interface StatusReport {
  status: 'progressing' | 'completed' | 'blocked';
  summary: string;
  user_summary: string | null;
}

export interface UsageStats {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export interface SessionMetadata {
  id: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  reasoning_tokens: number;
  estimated_cost_usd: number | null;
  cost_status: string | null;
  model: string | null;
}

export interface AgentDefaults {
  provider: string | null;
  model: string | null;
  baseUrl: string | null;
  apiMode: string | null;
  reasoningEffort: ReasoningEffort | null;
  showReasoning: boolean;
}

export interface AgentModelOption {
  id: string;
  label: string;
  source: 'current' | 'catalog' | 'custom' | 'alias';
  isCurrentDefault?: boolean;
}

export interface AgentModelGroup {
  provider: string;
  models: AgentModelOption[];
}

export interface AgentModelsResponse {
  defaultModel: string | null;
  activeProvider: string | null;
  groups: AgentModelGroup[];
}

export interface TaskAgentSettings {
  task: {
    model: string | null;
    reasoningEffort: ReasoningEffort | null;
  };
  defaults: AgentDefaults;
  effective: {
    model: string | null;
    provider: string | null;
    reasoningEffort: ReasoningEffort | null;
  };
}

export interface CronJobOrigin {
  platform?: string | null;
  chat_id?: string | null;
  chat_name?: string | null;
  thread_id?: string | null;
  [key: string]: unknown;
}

export interface CronJob {
  id: string;
  name: string;
  prompt: string | null;
  schedule: Record<string, unknown> | null;
  scheduleDisplay: string | null;
  enabled: boolean;
  state: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastStatus: CronStatus | null;
  lastError: string | null;
  lastDeliveryError: string | null;
  model: string | null;
  provider: string | null;
  baseUrl: string | null;
  deliver: string | null;
  origin: CronJobOrigin | null;
  skills: string[];
  createdAt: string | null;
  linkedTaskIds?: string[];
}

export type CronStatus = 'ok' | 'error' | 'unknown';

export interface CronRun {
  id: string;
  jobId: string;
  ranAt: string | null;
  path: string;
  status: CronStatus;
  preview: string;
  content?: string;
}
