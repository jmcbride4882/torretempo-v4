const API_BASE = import.meta.env.VITE_API_URL || '';

export interface Location {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  lat: string | null;
  lng: string | null;
  geofence_radius: number | null;
  created_at: string;
  updated_at: string;
}

export interface LocationsResponse {
  locations: Location[];
  total: number;
}

export interface LocationResponse {
  location: Location;
}

export interface LocationQRResponse {
  locationId: string;
  locationName: string;
  qrCode: string;
}

export interface CreateLocationData {
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  geofence_radius?: number;
}

export interface UpdateLocationData {
  name?: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  geofence_radius?: number | null;
}

class LocationApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'LocationApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new LocationApiError(
      data.message || data.error || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }
  return response.json();
}

export async function fetchLocations(slug: string): Promise<LocationsResponse> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/locations`, {
    credentials: 'include',
  });
  return handleResponse<LocationsResponse>(response);
}

export async function fetchLocation(slug: string, id: string): Promise<LocationResponse> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/locations/${id}`, {
    credentials: 'include',
  });
  return handleResponse<LocationResponse>(response);
}

export async function createLocation(
  slug: string,
  data: CreateLocationData
): Promise<{ message: string; location: Location }> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/locations`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<{ message: string; location: Location }>(response);
}

export async function updateLocation(
  slug: string,
  id: string,
  data: UpdateLocationData
): Promise<{ message: string; location: Location }> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/locations/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<{ message: string; location: Location }>(response);
}

export async function deleteLocation(
  slug: string,
  id: string
): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/locations/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return handleResponse<{ message: string }>(response);
}

export async function fetchLocationQR(
  slug: string,
  id: string
): Promise<LocationQRResponse> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/locations/${id}/qr`, {
    credentials: 'include',
  });
  return handleResponse<LocationQRResponse>(response);
}
