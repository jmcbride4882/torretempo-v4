import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { time_entries, monthly_summaries, user, member } from '../db/schema.js';

/**
 * Payroll export row for A3Nom format
 */
interface PayrollExportRow {
  nif: string;
  apellidos: string;
  nombre: string;
  fechaAlta: string; // YYYY-MM-DD
  horasTrabajadas: number;
  horasExtra: number;
  fechaDesde: string;
  fechaHasta: string;
  observaciones: string;
}

/**
 * Format date as YYYY-MM-DD for Spanish payroll systems
 */
function formatDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Split full name into apellidos (last name) and nombre (first name)
 * Assumes "FirstName LastName" format, defaults to full name for apellidos if no space
 */
function splitName(fullName: string): { apellidos: string; nombre: string } {
  const parts = fullName.trim().split(' ');
  
  if (parts.length === 1) {
    return { apellidos: parts[0]!, nombre: '' };
  }
  
  // First part is nombre, rest is apellidos
  const nombre = parts[0]!;
  const apellidos = parts.slice(1).join(' ');
  
  return { apellidos, nombre };
}

/**
 * Calculate regular and overtime hours
 * Spanish standard: 160 hours/month for full-time
 */
function calculateHours(totalMinutes: number): { regular: number; overtime: number } {
  const totalHours = totalMinutes / 60;
  const regularHours = Math.min(totalHours, 160);
  const overtimeHours = Math.max(0, totalHours - 160);
  
  return {
    regular: Math.round(regularHours * 100) / 100,
    overtime: Math.round(overtimeHours * 100) / 100,
  };
}

/**
 * Generate payroll CSV in A3Nom format
 * 
 * A3Nom CSV Format:
 * NIF/NIE,Apellidos,Nombre,Fecha_Alta,Horas_Trabajadas,Horas_Extra,Fecha_Desde,Fecha_Hasta,Observaciones
 * 
 * @param organizationId - Organization ID
 * @param month - Month (1-12)
 * @param year - Year (e.g., 2026)
 * @returns CSV string with UTF-8 BOM
 */
export async function generatePayrollCSV(
  organizationId: string,
  month: number,
  year: number
): Promise<string> {
  // Validate inputs
  if (month < 1 || month > 12) {
    throw new Error('Month must be between 1 and 12');
  }
  
  if (year < 2000 || year > 2100) {
    throw new Error('Invalid year');
  }
  
  // Calculate period start and end dates
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  
  // Format period dates for CSV
  const fechaDesde = formatDateYYYYMMDD(startDate);
  const fechaHasta = formatDateYYYYMMDD(endDate);
  
  // First, try to use monthly_summaries if available (more efficient)
  const summariesData = await db
    .select({
      userId: monthly_summaries.user_id,
      totalHours: monthly_summaries.total_hours,
      overtimeHours: monthly_summaries.overtime_hours,
      userName: user.name,
      userEmail: user.email,
      memberCreatedAt: member.createdAt,
    })
    .from(monthly_summaries)
    .innerJoin(user, eq(monthly_summaries.user_id, user.id))
    .innerJoin(
      member,
      and(
        eq(member.userId, user.id),
        eq(member.organizationId, organizationId)
      )
    )
    .where(
      and(
        eq(monthly_summaries.organization_id, organizationId),
        eq(monthly_summaries.year, year),
        eq(monthly_summaries.month, month)
      )
    );
  
  let payrollRows: PayrollExportRow[] = [];
  
  if (summariesData.length > 0) {
    // Use monthly summaries data
    payrollRows = summariesData.map((row) => {
      const { apellidos, nombre } = splitName(row.userName);
      const totalHours = parseFloat(row.totalHours as string) || 0;
      const overtimeHours = parseFloat(row.overtimeHours as string) || 0;
      const regularHours = totalHours - overtimeHours;
      
      return {
        nif: row.userEmail, // Fallback: use email as NIF not available
        apellidos,
        nombre,
        fechaAlta: formatDateYYYYMMDD(row.memberCreatedAt),
        horasTrabajadas: Math.round(regularHours * 100) / 100,
        horasExtra: Math.round(overtimeHours * 100) / 100,
        fechaDesde,
        fechaHasta,
        observaciones: 'Normal',
      };
    });
  } else {
    // Fallback: aggregate from time_entries
    const entriesData = await db
      .select({
        userId: time_entries.user_id,
        totalMinutes: sql<number>`SUM(${time_entries.total_minutes})`.as('total_minutes'),
        userName: user.name,
        userEmail: user.email,
        memberCreatedAt: member.createdAt,
      })
      .from(time_entries)
      .innerJoin(user, eq(time_entries.user_id, user.id))
      .innerJoin(
        member,
        and(
          eq(member.userId, user.id),
          eq(member.organizationId, organizationId)
        )
      )
      .where(
        and(
          eq(time_entries.organization_id, organizationId),
          eq(time_entries.status, 'completed'),
          gte(time_entries.entry_date, startDate),
          lte(time_entries.entry_date, endDate)
        )
      )
      .groupBy(time_entries.user_id, user.name, user.email, member.createdAt);
    
    payrollRows = entriesData.map((row) => {
      const { apellidos, nombre } = splitName(row.userName);
      const { regular, overtime } = calculateHours(row.totalMinutes || 0);
      
      return {
        nif: row.userEmail, // Fallback: use email as NIF not available
        apellidos,
        nombre,
        fechaAlta: formatDateYYYYMMDD(row.memberCreatedAt),
        horasTrabajadas: regular,
        horasExtra: overtime,
        fechaDesde,
        fechaHasta,
        observaciones: 'Normal',
      };
    });
  }
  
  // Sort by apellidos (last name) for easier reading
  payrollRows.sort((a, b) => a.apellidos.localeCompare(b.apellidos));
  
  // Generate CSV with UTF-8 BOM for Excel compatibility
  const BOM = '\ufeff';
  const header = 'NIF/NIE,Apellidos,Nombre,Fecha_Alta,Horas_Trabajadas,Horas_Extra,Fecha_Desde,Fecha_Hasta,Observaciones';
  
  const rows = payrollRows.map((row) => {
    return [
      row.nif,
      row.apellidos,
      row.nombre,
      row.fechaAlta,
      row.horasTrabajadas.toString(),
      row.horasExtra.toString(),
      row.fechaDesde,
      row.fechaHasta,
      row.observaciones,
    ]
      .map((field) => {
        // Escape fields containing commas or quotes
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      })
      .join(',');
  });
  
  return BOM + header + '\n' + rows.join('\n');
}
