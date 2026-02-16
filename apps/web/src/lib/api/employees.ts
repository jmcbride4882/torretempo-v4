const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface Employee {
  id: string;
  user_id: string;
  organization_id: string;
  dni_nie: string;
  social_security_number: string;
  date_of_birth: string;
  job_title: string;
  employment_type: 'indefinido' | 'temporal' | 'practicas' | 'formacion';
  contract_start_date: string;
  contract_end_date: string | null;
  working_hours_per_week: number;
  tax_id: string | null;
  phone_number: string | null;
  address: {
    street: string;
    city: string;
    postal_code: string;
    province?: string;
    country: string;
  } | null;
  emergency_contact: {
    name: string;
    relationship: string;
    phone_number: string;
    email?: string;
  } | null;
  vacation_days_accrued: string;
  vacation_days_used: string;
  data_processing_consent: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeesResponse {
  employees: Employee[];
  count: number;
}

export interface EmployeeResponse {
  employee: Employee;
}

export interface CreateEmployeeData {
  user_id: string;
  dni_nie: string;
  social_security_number: string;
  date_of_birth: string;
  job_title: string;
  employment_type: 'indefinido' | 'temporal' | 'practicas' | 'formacion';
  contract_start_date: string;
  contract_end_date?: string;
  working_hours_per_week: number;
  tax_id?: string;
  phone_number?: string;
  address?: Employee['address'];
  emergency_contact?: Employee['emergency_contact'];
  data_processing_consent?: boolean;
}

export type UpdateEmployeeData = Partial<Omit<CreateEmployeeData, 'user_id'>>;

class EmployeeApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'EmployeeApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new EmployeeApiError(
      data.message || data.error || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }
  return response.json();
}

export async function fetchEmployees(slug: string): Promise<EmployeesResponse> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/employees`, {
    credentials: 'include',
  });
  return handleResponse<EmployeesResponse>(response);
}

export async function fetchEmployee(slug: string, id: string): Promise<EmployeeResponse> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/employees/${id}`, {
    credentials: 'include',
  });
  return handleResponse<EmployeeResponse>(response);
}

export async function createEmployee(
  slug: string,
  data: CreateEmployeeData
): Promise<EmployeeResponse> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/employees`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<EmployeeResponse>(response);
}

export async function updateEmployee(
  slug: string,
  id: string,
  data: UpdateEmployeeData
): Promise<EmployeeResponse> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/employees/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<EmployeeResponse>(response);
}

export async function deleteEmployee(slug: string, id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/org/${slug}/employees/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new EmployeeApiError(
      data.message || data.error || 'Failed to delete employee',
      response.status,
      data
    );
  }
}
