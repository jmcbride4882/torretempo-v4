/**
 * Employee Profile Types
 * 
 * Employment data and PII stored separately from auth.
 * Encrypted fields store Base64-encoded encrypted data.
 */

export const EMPLOYMENT_TYPES = {
  INDEFINIDO: 'indefinido',
  TEMPORAL: 'temporal',
  PRACTICAS: 'practicas',
  FORMACION: 'formacion',
} as const;

export type EmploymentType = typeof EMPLOYMENT_TYPES[keyof typeof EMPLOYMENT_TYPES];

/**
 * Employee profile stored in database
 */
export interface EmployeeProfile {
  id: string;
  user_id: string;
  organization_id: string;

  // Personal Information (ENCRYPTED)
  dni_nie_encrypted: string;
  social_security_number_encrypted: string;
  date_of_birth: Date;
  nationality?: string; // ISO 3166-1 alpha-3
  tax_id_encrypted?: string;
  phone_number_encrypted?: string;
  address_encrypted?: string; // Encrypted JSONB
  emergency_contact_encrypted?: string; // Encrypted JSONB

  // Employment Information
  employee_number?: string;
  job_title: string;
  department?: string;
  employment_type: EmploymentType;
  contract_start_date: Date;
  contract_end_date?: Date;
  base_salary_cents?: number;
  working_hours_per_week: number;
  work_location_id?: string;

  // Leave Balance
  vacation_days_accrued: number;
  vacation_days_used: number;
  sick_days_used: number;

  // Compliance
  health_safety_training_date?: Date;
  work_permit_number_encrypted?: string;
  work_permit_expiry?: Date;

  // GDPR
  gdpr_consent_date?: Date;
  data_processing_consent: boolean;

  // Metadata
  created_at: Date;
  updated_at: Date;
}

/**
 * Decrypted address structure
 */
export interface EmployeeAddress {
  street: string;
  city: string;
  postal_code: string;
  province: string;
  country: string;
}

/**
 * Decrypted emergency contact structure
 */
export interface EmergencyContact {
  name: string;
  relationship: string;
  phone_number: string;
  email?: string;
}

/**
 * Employee profile with decrypted sensitive fields
 */
export interface EmployeeProfileDecrypted extends Omit<
  EmployeeProfile,
  | 'dni_nie_encrypted'
  | 'social_security_number_encrypted'
  | 'tax_id_encrypted'
  | 'phone_number_encrypted'
  | 'address_encrypted'
  | 'emergency_contact_encrypted'
  | 'work_permit_number_encrypted'
> {
  dni_nie: string;
  social_security_number: string;
  tax_id?: string;
  phone_number?: string;
  address?: EmployeeAddress;
  emergency_contact?: EmergencyContact;
  work_permit_number?: string;
}

/**
 * Create employee profile request (with plaintext sensitive fields)
 */
export interface CreateEmployeeProfileRequest {
  user_id: string;
  organization_id: string;
  
  // Personal Information (plaintext - will be encrypted)
  dni_nie: string;
  social_security_number: string;
  date_of_birth: Date | string;
  nationality?: string;
  tax_id?: string;
  phone_number?: string;
  address?: EmployeeAddress;
  emergency_contact?: EmergencyContact;
  
  // Employment Information
  employee_number?: string;
  job_title: string;
  department?: string;
  employment_type: EmploymentType;
  contract_start_date: Date | string;
  contract_end_date?: Date | string;
  base_salary_cents?: number;
  working_hours_per_week: number;
  work_location_id?: string;
  
  // Compliance
  health_safety_training_date?: Date | string;
  work_permit_number?: string;
  work_permit_expiry?: Date | string;
  
  // GDPR
  data_processing_consent: boolean;
}
