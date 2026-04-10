/**
 * CrisisGuard AI - API Client
 * Centralized HTTP client for all backend service calls.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const AI_GATEWAY_URL = process.env.NEXT_PUBLIC_AI_GATEWAY_URL || 'http://localhost:8001';

interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  error?: string;
}

async function request<T>(
  url: string,
  options: RequestInit = {},
  token?: string,
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ─── Incident APIs ──────────────────────────────────────────

export async function fetchIncidents(token: string) {
  return request<unknown[]>(`${API_BASE_URL}/api/incidents`, {}, token);
}

export async function fetchIncidentById(id: string, token: string) {
  return request<unknown>(`${API_BASE_URL}/api/incidents/${id}`, {}, token);
}

export async function updateIncidentStatus(
  id: string,
  status: string,
  token: string,
) {
  return request<unknown>(
    `${API_BASE_URL}/api/incidents/${id}/status`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
    token,
  );
}

// ─── Staff APIs ─────────────────────────────────────────────

export async function fetchStaff(token: string) {
  return request<unknown[]>(`${API_BASE_URL}/api/users?role=staff`, {}, token);
}

export async function assignStaffToIncident(
  incidentId: string,
  staffUid: string,
  token: string,
) {
  return request<unknown>(
    `${API_BASE_URL}/api/incidents/${incidentId}/assign`,
    { method: 'POST', body: JSON.stringify({ staffUid }) },
    token,
  );
}

// ─── Location APIs ──────────────────────────────────────────

export async function fetchPropertyOccupancy(propertyId: string, token: string) {
  return request<unknown>(
    `${API_BASE_URL}/api/location/property/${propertyId}/headcount`,
    {},
    token,
  );
}

export async function fetchZoneOccupancy(
  propertyId: string,
  zone: string,
  floor: number,
  token: string,
) {
  return request<unknown>(
    `${API_BASE_URL}/api/location/zone/${propertyId}?zone=${zone}&floor=${floor}`,
    {},
    token,
  );
}

// ─── AI Gateway APIs ────────────────────────────────────────

export async function analyzeImage(payload: {
  image_url?: string;
  image_base64?: string;
  property_id: string;
  camera_id?: string;
  zone?: string;
  floor?: number;
}) {
  return request<unknown>(`${AI_GATEWAY_URL}/api/ai/analyze/image`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function analyzeText(payload: {
  text: string;
  property_id: string;
  source?: string;
}) {
  return request<unknown>(`${AI_GATEWAY_URL}/api/ai/analyze/text`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ─── Chat APIs ──────────────────────────────────────────────

export async function fetchMessages(channel: string, channelId: string, token: string) {
  return request<unknown[]>(
    `${API_BASE_URL}/api/chat/messages/${channel}/${channelId}`,
    {},
    token,
  );
}

export async function sendMessage(
  body: { channel: string; channelId: string; content: string; type?: string },
  token: string,
) {
  return request<unknown>(
    `${API_BASE_URL}/api/chat/messages`,
    { method: 'POST', body: JSON.stringify(body) },
    token,
  );
}
