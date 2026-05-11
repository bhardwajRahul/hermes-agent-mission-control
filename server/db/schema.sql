CREATE TABLE IF NOT EXISTS tasks (
  id                TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  description       TEXT,
  status            TEXT NOT NULL DEFAULT 'in_progress',
  agent_model       TEXT,
  reasoning_effort  TEXT,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  last_agent_response_at  INTEGER,
  last_viewed_at    INTEGER,
  last_usage_input_tokens  INTEGER,
  last_usage_output_tokens INTEGER,
  last_usage_total_tokens  INTEGER
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

