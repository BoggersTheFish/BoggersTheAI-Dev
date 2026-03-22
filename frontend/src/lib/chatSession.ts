/**
 * Browser session id for TS-OS chat (sent as X-Boggers-Session-ID — isolates graph memory per chat).
 */

const SESSION_KEY = "boggers-session-id";

export function getChatSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "";
  }
}

/** New chat = new graph conversation chain on the server + clear local transcript cache. */
export function startNewChatSession(): string {
  if (typeof window === "undefined") return "";
  try {
    const sid = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sid);
    return sid;
  } catch {
    return "";
  }
}

export function chatTranscriptKey(sessionId: string): string {
  return `boggers-chat-transcript:${sessionId}`;
}
