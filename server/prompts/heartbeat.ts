import type { HeartbeatLogEntry, StatusReport } from '../../shared/types.js';

export function buildCheckinPrompt(recentLogs: HeartbeatLogEntry[]): string {
  const now = new Date().toISOString();

  let previousCheckins: string;
  if (recentLogs.length === 0) {
    previousCheckins = 'No previous check-ins recorded.';
  } else {
    previousCheckins = recentLogs
      .map((log) => {
        const time = new Date(log.created_at).toISOString();
        let summary = '';
        if (log.details) {
          try {
            const parsed = JSON.parse(log.details);
            summary = parsed.summary || JSON.stringify(parsed);
          } catch {
            summary = log.details;
          }
        }
        return `- [${time}] ${log.action}: ${summary}`;
      })
      .join('\n');
  }

  return `[AUTOMATED CHECK-IN]

<heartbeat>
<context>
Automated check-in. Current time: ${now}
</context>

<previous_checkins>
${previousCheckins}
</previous_checkins>

<instructions>
Your primary job during this check-in is to ADVANCE your task — not just report.

- If you were waiting for the user to answer a question and they have not responded: assume a reasonable answer and proceed. Do not wait any longer.
- If your current approach is stuck: try a different one right now before reporting blocked.
- If you have tools available: use them to make concrete progress during this turn.
- Only report "blocked" if you have genuinely exhausted alternatives and cannot proceed without specific human input.
- Report "completed" only when the task is fully done and ready for human review.
</instructions>

<output_format>
After taking any actions, report your status inside a status_report tag.

Fields:
- status (required): one of "progressing", "completed", or "blocked"
  - "progressing" — you made progress and will continue next check-in
  - "completed" — work is fully done, ready for human review
  - "blocked" — you exhausted alternatives and need specific human input to proceed
- summary (required): what you did this turn and your current state
- user_summary (optional): only include this field when the user needs to see something — you need their input, you finished the task, you hit a milestone, or something unexpected happened. Omit entirely for routine progress.

Example:

<status_report>
{"status": "progressing", "summary": "Scraped 12 listings from the target site, stored in output.json. Next step: dedup and format."}
</status_report>
</output_format>
</heartbeat>`;
}

export function parseStatusResponse(response: string): StatusReport | null {
  const match = response.match(/<status_report>\s*([\s\S]*?)\s*<\/status_report>/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (!parsed.status || !['progressing', 'completed', 'blocked'].includes(parsed.status)) return null;
    return {
      status: parsed.status,
      summary: parsed.summary ?? '',
      user_summary: parsed.user_summary ?? null,
    };
  } catch {
    return null;
  }
}
