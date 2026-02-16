const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ShiftTemplate {
  id: string;
  organization_id: string;
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  location_id: string | null;
  location_name: string | null;
  color: string | null;
  required_skill_id: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ShiftTemplatesResponse {
  templates: ShiftTemplate[];
}

export interface ShiftTemplateResponse {
  template: ShiftTemplate;
}

export interface CreateShiftTemplateData {
  name: string;
  start_time: string;
  end_time: string;
  break_minutes?: number;
  location_id?: string;
  color?: string;
  required_skill_id?: string;
}

export interface UpdateShiftTemplateData {
  name?: string;
  start_time?: string;
  end_time?: string;
  break_minutes?: number;
  location_id?: string | null;
  color?: string | null;
  required_skill_id?: string | null;
}

class ShiftTemplateApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ShiftTemplateApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ShiftTemplateApiError(
      data.message || data.error || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }
  return response.json();
}

export async function fetchShiftTemplates(slug: string): Promise<ShiftTemplatesResponse> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/shift-templates`, {
    credentials: 'include',
  });
  return handleResponse<ShiftTemplatesResponse>(response);
}

export async function fetchShiftTemplate(
  slug: string,
  id: string
): Promise<ShiftTemplateResponse> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/shift-templates/${id}`, {
    credentials: 'include',
  });
  return handleResponse<ShiftTemplateResponse>(response);
}

export async function createShiftTemplate(
  slug: string,
  data: CreateShiftTemplateData
): Promise<ShiftTemplateResponse> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/shift-templates`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<ShiftTemplateResponse>(response);
}

export async function updateShiftTemplate(
  slug: string,
  id: string,
  data: UpdateShiftTemplateData
): Promise<ShiftTemplateResponse> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/shift-templates/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<ShiftTemplateResponse>(response);
}

export async function deleteShiftTemplate(slug: string, id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/shift-templates/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ShiftTemplateApiError(
      data.message || data.error || 'Failed to delete shift template',
      response.status,
      data
    );
  }
}
