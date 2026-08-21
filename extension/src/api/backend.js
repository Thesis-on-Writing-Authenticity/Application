// Client for the Writing Authenticity backend.
//
// Thin fetch wrappers that send writing-session metadata to the backend. The
// base URL comes from VITE_BACKEND_URL and defaults to the local dev server.
const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

async function request(path, options) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Backend ${response.status}: ${body}`);
  }

  return response.json();
}

// Create a session and return its generated id.
export async function createSession(session) {
  const { id } = await request("/api/sessions", {
    method: "POST",
    body: JSON.stringify(session),
  });
  return id;
}

// Append a batch of behavioural events to a session.
export async function sendEvents(sessionId, events) {
  return request(`/api/sessions/${sessionId}/events`, {
    method: "POST",
    body: JSON.stringify({ events }),
  });
}

// Mark a session as ended.
export async function endSession(sessionId, endedAt) {
  return request(`/api/sessions/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify({ endedAt }),
  });
}

// Fetch one session with its events and computed metrics.
export async function getSession(sessionId) {
  return request(`/api/sessions/${sessionId}`);
}
