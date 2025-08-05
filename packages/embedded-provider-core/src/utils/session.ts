export function generateSessionId(): string {
  return (
    "session_" +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15) +
    "_" +
    Date.now()
  );
}
