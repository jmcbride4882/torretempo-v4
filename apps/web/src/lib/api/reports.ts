/**
 * Reports API Client
 * Frontend API client for report operations in Torre Tempo V4
 */

import type {
  ReportsResponse,
  ReportResponse,
  ReportFilter,
  ReportGenerationRequest,
  ReportGenerationResponse,
  PDFDownloadResponse,
  MonthlyReport,
  TeamMember,
} from '@/types/reports';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Error class for API errors
 */
export class ReportApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ReportApiError';
  }
}

/**
 * Helper to handle API responses
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ReportApiError(
      data.message || data.error || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }
  return response.json();
}

/**
 * Fetch all reports with optional filters
 */
export async function fetchReports(
  orgSlug: string,
  filters?: ReportFilter
): Promise<ReportsResponse> {
  const params = new URLSearchParams();

  if (filters?.year) params.append('year', filters.year.toString());
  if (filters?.month) params.append('month', filters.month.toString());
  if (filters?.userId) params.append('user_id', filters.userId);
  if (filters?.reportType) params.append('type', filters.reportType);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.startDate) params.append('start_date', filters.startDate);
  if (filters?.endDate) params.append('end_date', filters.endDate);

  const url = `${API_URL}/api/v1/org/${orgSlug}/reports?${params.toString()}`;

  const response = await fetch(url, {
    credentials: 'include',
  });

  return handleResponse<ReportsResponse>(response);
}

/**
 * Fetch a single report by ID with full details
 */
export async function fetchReport(
  orgSlug: string,
  reportId: string
): Promise<ReportResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/reports/${reportId}`;

  const response = await fetch(url, {
    credentials: 'include',
  });

  return handleResponse<ReportResponse>(response);
}

/**
 * Generate a new report
 */
export async function generateReport(
  orgSlug: string,
  data: ReportGenerationRequest
): Promise<ReportGenerationResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/reports/generate`;

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  return handleResponse<ReportGenerationResponse>(response);
}

/**
 * Download report as PDF
 */
export async function downloadReportPDF(
  orgSlug: string,
  reportId: string
): Promise<PDFDownloadResponse> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/reports/${reportId}/download`;

  const response = await fetch(url, {
    credentials: 'include',
  });

  return handleResponse<PDFDownloadResponse>(response);
}

/**
 * Fetch monthly report for specific year/month/user
 * Backend route: GET /api/v1/org/:slug/reports/monthly/:year/:month?user_id=...
 */
export async function fetchMonthlyReport(
  orgSlug: string,
  year: number,
  month: number,
  userId?: string
): Promise<MonthlyReport> {
  const params = new URLSearchParams();
  if (userId) params.append('user_id', userId);

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const url = `${API_URL}/api/v1/org/${orgSlug}/reports/monthly/${year}/${month}${queryString}`;

  const response = await fetch(url, {
    credentials: 'include',
  });

  return handleResponse<MonthlyReport>(response);
}

/**
 * Fetch team members for filter dropdown
 */
export async function fetchTeamMembers(orgSlug: string): Promise<TeamMember[]> {
  const url = `${API_URL}/api/v1/org/${orgSlug}/members`;

  const response = await fetch(url, {
    credentials: 'include',
  });

  const data = await handleResponse<{ members: TeamMember[] }>(response);
  return data.members || [];
}

// NOTE: emailReport and getReportStatus endpoints are not yet implemented on the backend.
// TODO: Add backend routes POST /reports/:id/email and GET /reports/:id/status when needed.
