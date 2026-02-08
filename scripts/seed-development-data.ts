import { db } from '../apps/api/src/db/index.js';
import {
  organization,
  member,
  user,
  account,
  locations,
  employee_profiles,
  shifts,
  time_entries,
  swap_requests,
  leave_requests,
} from '../apps/api/src/db/schema.js';
import { encryption } from '../apps/api/src/lib/encryption.js';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';
import 'dotenv/config';

/**
 * Seed Development Data
 * 
 * Creates comprehensive test data for Torre Tempo V4:
 * - 1 demo organization
 * - 10 users (2 managers, 8 employees)
 * - 10 employee profiles with encrypted PII
 * - 3 locations with GPS coordinates
 * - 50 shifts across 2 weeks
 * - 20 time entries with realistic clock in/out times
 * - 5 swap requests (various statuses)
 * - 3 leave requests (vacation, sick leave, personal)
 * 
 * IDEMPOTENT: Deletes existing demo data before seeding
 */

interface UserData {
  name: string;
  email: string;
  role: 'manager' | 'employee';
  jobTitle: string;
  dni: string;
  phone: string;
  address: {
    street: string;
    city: string;
    postal_code: string;
    country: string;
  };
}

interface CreatedUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  role: 'manager' | 'employee';
  userData: UserData;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: Date | null;
}

// Realistic Spanish test users
const USERS: UserData[] = [
  // Managers (2)
  {
    name: 'Carlos López García',
    email: 'carlos.lopez@demo.com',
    role: 'manager',
    jobTitle: 'Gerente de Operaciones',
    dni: '12345678A',
    phone: '+34 612 345 678',
    address: {
      street: 'Calle Gran Vía 28, 3º A',
      city: 'Madrid',
      postal_code: '28013',
      country: 'España',
    },
  },
  {
    name: 'Laura Martínez Ruiz',
    email: 'laura.martinez@demo.com',
    role: 'manager',
    jobTitle: 'Jefa de Sala',
    dni: '23456789B',
    phone: '+34 623 456 789',
    address: {
      street: 'Calle Alcalá 42, 2º B',
      city: 'Madrid',
      postal_code: '28014',
      country: 'España',
    },
  },
  // Employees (8)
  {
    name: 'María García Sánchez',
    email: 'maria.garcia@demo.com',
    role: 'employee',
    jobTitle: 'Camarera',
    dni: '34567890C',
    phone: '+34 634 567 890',
    address: {
      street: 'Calle Serrano 15, 1º C',
      city: 'Madrid',
      postal_code: '28001',
      country: 'España',
    },
  },
  {
    name: 'Ana Rodríguez López',
    email: 'ana.rodriguez@demo.com',
    role: 'employee',
    jobTitle: 'Chef',
    dni: '45678901D',
    phone: '+34 645 678 901',
    address: {
      street: 'Calle Goya 30, 4º D',
      city: 'Madrid',
      postal_code: '28001',
      country: 'España',
    },
  },
  {
    name: 'José Fernández Pérez',
    email: 'jose.fernandez@demo.com',
    role: 'employee',
    jobTitle: 'Camarero',
    dni: '56789012E',
    phone: '+34 656 789 012',
    address: {
      street: 'Calle Velázquez 50, 2º A',
      city: 'Madrid',
      postal_code: '28001',
      country: 'España',
    },
  },
  {
    name: 'Carmen Sánchez Martín',
    email: 'carmen.sanchez@demo.com',
    role: 'employee',
    jobTitle: 'Barista',
    dni: '67890123F',
    phone: '+34 667 890 123',
    address: {
      street: 'Calle Princesa 22, 3º B',
      city: 'Madrid',
      postal_code: '28008',
      country: 'España',
    },
  },
  {
    name: 'Miguel Torres Jiménez',
    email: 'miguel.torres@demo.com',
    role: 'employee',
    jobTitle: 'Sous Chef',
    dni: '78901234G',
    phone: '+34 678 901 234',
    address: {
      street: 'Calle Bravo Murillo 100, 5º C',
      city: 'Madrid',
      postal_code: '28003',
      country: 'España',
    },
  },
  {
    name: 'Isabel Ruiz Moreno',
    email: 'isabel.ruiz@demo.com',
    role: 'employee',
    jobTitle: 'Anfitriona',
    dni: '89012345H',
    phone: '+34 689 012 345',
    address: {
      street: 'Calle Atocha 25, 1º D',
      city: 'Madrid',
      postal_code: '28012',
      country: 'España',
    },
  },
  {
    name: 'David Moreno Álvarez',
    email: 'david.moreno@demo.com',
    role: 'employee',
    jobTitle: 'Camarero',
    dni: '90123456I',
    phone: '+34 690 123 456',
    address: {
      street: 'Calle Fuencarral 80, 4º A',
      city: 'Madrid',
      postal_code: '28004',
      country: 'España',
    },
  },
  {
    name: 'Elena Jiménez Castro',
    email: 'elena.jimenez@demo.com',
    role: 'employee',
    jobTitle: 'Camarera',
    dni: '01234567J',
    phone: '+34 601 234 567',
    address: {
      street: 'Calle Arenal 10, 2º C',
      city: 'Madrid',
      postal_code: '28013',
      country: 'España',
    },
  },
];

function generateDNI(): string {
  const numbers = Math.floor(Math.random() * 100000000)
    .toString()
    .padStart(8, '0');
  const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
  const letter = letters[parseInt(numbers) % 23];
  return numbers + letter;
}

async function cleanExistingData(orgId: string) {
  console.log('🧹 Cleaning existing demo data...');

  try {
    // Delete organization (CASCADE will delete all related data)
    await db.delete(organization).where(eq(organization.id, orgId));
    console.log('   ✓ Existing demo data cleaned');
  } catch (error) {
    // Organization might not exist yet
    console.log('   ✓ No existing data to clean');
  }
}

async function seed() {
  console.log('🌱 Seeding Torre Tempo V4 development data...\n');

  try {
    const orgId = 'org_demo_restaurant';

    // 1. Clean existing demo data (idempotent)
    await cleanExistingData(orgId);

    // 2. Create demo organization
    console.log('🏢 Creating demo organization...');
    const [org] = await db
      .insert(organization)
      .values({
        id: orgId,
        name: 'Demo Restaurant',
        slug: 'demo-restaurant',
        createdAt: new Date(),
      })
      .returning();

    if (!org) {
      throw new Error('Failed to create organization');
    }

    console.log(`   ✓ Organization created: ${org.name} (${org.slug})`);

    // 3. Create users and members
    console.log('\n👥 Creating users...');
    const createdUsers: CreatedUser[] = [];

    for (const userData of USERS) {
      const userId = `user_demo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const passwordHash = createHash('sha256').update('Demo123!').digest('hex');

      // Create user
      const [newUser] = await db
        .insert(user)
        .values({
          id: userId,
          name: userData.name,
          email: userData.email,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!newUser) {
        throw new Error(`Failed to create user: ${userData.name}`);
      }

      // Create account (password)
      await db.insert(account).values({
        id: `account_${userId}`,
        accountId: userId,
        providerId: 'credential',
        userId: userId,
        password: passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create member (link user to organization)
      await db.insert(member).values({
        id: `member_${userId}`,
        organizationId: org.id,
        userId: userId,
        role: userData.role,
        createdAt: new Date(),
      });

      createdUsers.push({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        emailVerified: newUser.emailVerified,
        image: newUser.image,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
        role: userData.role,
        userData,
      });
      console.log(`   ✓ ${userData.name} (${userData.role})`);
    }

    // 4. Create locations with GPS coordinates (Madrid area)
    console.log('\n📍 Creating locations...');

    const [location1] = await db
      .insert(locations)
      .values({
        organization_id: org.id,
        name: 'Main Kitchen',
        address: 'Calle Gran Vía 28, 28013 Madrid',
        lat: '40.4200000',
        lng: '-3.7050000',
        geofence_radius: 50,
        created_at: new Date(),
      })
      .returning();

    const [location2] = await db
      .insert(locations)
      .values({
        organization_id: org.id,
        name: 'Terrace Area',
        address: 'Calle Gran Vía 28, Terraza, 28013 Madrid',
        lat: '40.4201000',
        lng: '-3.7051000',
        geofence_radius: 30,
        created_at: new Date(),
      })
      .returning();

    const [location3] = await db
      .insert(locations)
      .values({
        organization_id: org.id,
        name: 'Storage Room',
        address: 'Calle Gran Vía 28, Almacén, 28013 Madrid',
        lat: '40.4199500',
        lng: '-3.7049500',
        geofence_radius: 20,
        created_at: new Date(),
      })
      .returning();

    if (!location1 || !location2 || !location3) {
      throw new Error('Failed to create locations');
    }

    console.log(`   ✓ ${location1.name} (${location1.lat}, ${location1.lng})`);
    console.log(`   ✓ ${location2.name} (${location2.lat}, ${location2.lng})`);
    console.log(`   ✓ ${location3.name} (${location3.lat}, ${location3.lng})`);

    // 5. Create employee profiles with ENCRYPTED PII
    console.log('\n🔐 Creating employee profiles (encrypting PII)...');

    for (const u of createdUsers) {
      const userData = USERS.find((ud) => ud.email === u.email);
      if (!userData) continue;

      // Generate SSN (Número de la Seguridad Social)
      const ssn = `ES${userData.dni.substring(0, 8)}`;

      await db.insert(employee_profiles).values({
        user_id: u.id,
        organization_id: org.id,
        dni_nie_encrypted: encryption.encrypt(userData.dni),
        social_security_number_encrypted: encryption.encrypt(ssn),
        date_of_birth: new Date('1990-06-15'), // Fixed birthdate for simplicity
        nationality: 'ESP',
        tax_id_encrypted: encryption.encrypt(userData.dni),
        phone_number_encrypted: encryption.encrypt(userData.phone),
        address_encrypted: encryption.encryptJSON(userData.address),
        emergency_contact_encrypted: encryption.encryptJSON({
          name: 'Contacto Emergencia',
          phone: '+34 600 000 000',
          relationship: 'Familiar',
        }),
        employee_number: `EMP${String(createdUsers.indexOf(u) + 1).padStart(4, '0')}`,
        job_title: userData.jobTitle,
        department: u.role === 'manager' ? 'Gerencia' : 'Operaciones',
        employment_type: 'indefinido',
        contract_start_date: new Date('2024-01-15'),
        contract_end_date: null,
        base_salary_cents: u.role === 'manager' ? 350000 : 180000, // 3500€ manager, 1800€ employee
        working_hours_per_week: '40.00',
        work_location_id: location1.id,
        vacation_days_accrued: '22.0',
        vacation_days_used: '5.0',
        sick_days_used: 0,
        health_safety_training_date: new Date('2024-02-01'),
        work_permit_number_encrypted: null,
        work_permit_expiry: null,
        gdpr_consent_date: new Date('2024-01-15'),
        data_processing_consent: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      console.log(`   ✓ ${u.name} - ${userData.jobTitle}`);
    }

    // 6. Create shifts (50 across 2 weeks)
    console.log('\n📅 Creating shifts (50 total across 2 weeks)...');

    const shiftStatuses: Array<'draft' | 'published'> = ['draft', 'published', 'published', 'published'];
    const shiftTypes = [
      { name: 'Morning', start: '08:00', end: '16:00', break: 30 },
      { name: 'Afternoon', start: '14:00', end: '22:00', break: 45 },
      { name: 'Night', start: '20:00', end: '04:00', break: 60 },
    ];

    const managerUserId = createdUsers.find((u) => u.role === 'manager')?.id;
    if (!managerUserId) {
      throw new Error('No manager found');
    }

    const employeeUsers = createdUsers.filter((u) => u.role === 'employee');
    const shiftLocations = [location1.id, location2.id, location3.id];
    const createdShifts: Array<typeof shifts.$inferSelect> = [];

    // Create shifts for next 14 days
    for (let day = 0; day < 14; day++) {
      const shiftsPerDay = Math.floor(Math.random() * 2) + 3; // 3-4 shifts per day

      for (let i = 0; i < shiftsPerDay; i++) {
        const shiftType = shiftTypes[Math.floor(Math.random() * shiftTypes.length)]!;
        const status = shiftStatuses[Math.floor(Math.random() * shiftStatuses.length)]!;
        const assignedUser = employeeUsers[Math.floor(Math.random() * employeeUsers.length)];
        const location = shiftLocations[Math.floor(Math.random() * shiftLocations.length)];

        const startDate = new Date();
        startDate.setDate(startDate.getDate() + day);
        const [startHour, startMin] = shiftType.start.split(':').map(Number);
        startDate.setHours(startHour!, startMin!, 0, 0);

        const endDate = new Date(startDate);
        const [endHour, endMin] = shiftType.end.split(':').map(Number);
        endDate.setHours(endHour!, endMin!, 0, 0);

        // Handle overnight shifts
        if (endHour! < startHour!) {
          endDate.setDate(endDate.getDate() + 1);
        }

        const [shift] = await db
          .insert(shifts)
          .values({
            organization_id: org.id,
            user_id: assignedUser?.id || null,
            location_id: location!,
            template_id: null,
            start_time: startDate,
            end_time: endDate,
            break_minutes: shiftType.break,
            status: status === 'published' ? 'published' : 'draft',
            is_published: status === 'published',
            notes: status === 'draft' ? 'Pendiente de publicar' : null,
            color: '#3b82f6',
            required_skill_id: null,
            created_by: managerUserId,
            published_at: status === 'published' ? new Date() : null,
            acknowledged_at: null,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning();

        if (shift) {
          createdShifts.push(shift);
        }
      }
    }

    console.log(`   ✓ Created ${createdShifts.length} shifts`);

    // 7. Create time entries (20 total for past week)
    console.log('\n⏰ Creating time entries (20 total for past week)...');

    const createdTimeEntries: Array<typeof time_entries.$inferSelect> = [];

    for (let i = 0; i < 20; i++) {
      const employee = employeeUsers[Math.floor(Math.random() * employeeUsers.length)];
      if (!employee) continue;

      // Random day in past week
      const daysAgo = Math.floor(Math.random() * 7) + 1;
      const entryDate = new Date();
      entryDate.setDate(entryDate.getDate() - daysAgo);

      // Morning shift: 08:00 - 16:00
      const clockIn = new Date(entryDate);
      clockIn.setHours(8, Math.floor(Math.random() * 10), 0, 0); // 08:00-08:10

      const clockOut = new Date(clockIn);
      clockOut.setHours(16, Math.floor(Math.random() * 10), 0, 0); // 16:00-16:10

      const breakMinutes = 30;
      const totalMinutes = Math.floor((clockOut.getTime() - clockIn.getTime()) / 1000 / 60) - breakMinutes;

      const [timeEntry] = await db
        .insert(time_entries)
        .values({
          organization_id: org.id,
          user_id: employee.id,
          linked_shift_id: null,
          entry_date: entryDate,
          clock_in: clockIn,
          clock_in_location: {
            lat: 40.42,
            lng: -3.705,
            accuracy: 10,
          },
          clock_in_method: 'tap',
          clock_out: clockOut,
          clock_out_location: {
            lat: 40.42,
            lng: -3.705,
            accuracy: 12,
          },
          clock_out_method: 'tap',
          break_minutes: breakMinutes,
          total_minutes: totalMinutes,
          is_verified: true,
          status: 'completed',
          notes: null,
          created_at: clockIn,
          updated_at: clockOut,
        })
        .returning();

      if (timeEntry) {
        createdTimeEntries.push(timeEntry);
      }
    }

    console.log(`   ✓ Created ${createdTimeEntries.length} time entries`);

    // 8. Create swap requests (5 total with various statuses)
    console.log('\n🔄 Creating swap requests (5 total)...');

    const swapStatuses: Array<'pending_peer' | 'pending_manager' | 'approved' | 'rejected'> = [
      'pending_peer',
      'pending_peer',
      'pending_manager',
      'approved',
      'rejected',
    ];

    const publishedShifts = createdShifts.filter((s) => s.is_published);
    const createdSwaps: Array<typeof swap_requests.$inferSelect> = [];

    for (let i = 0; i < 5; i++) {
      if (publishedShifts.length < 2) break;

      const requester = employeeUsers[Math.floor(Math.random() * employeeUsers.length)];
      const recipient = employeeUsers[Math.floor(Math.random() * employeeUsers.length)];

      if (!requester || !recipient || requester.id === recipient.id) continue;

      const offeredShift = publishedShifts[Math.floor(Math.random() * publishedShifts.length)];
      const desiredShift = publishedShifts[Math.floor(Math.random() * publishedShifts.length)];

      if (!offeredShift || !desiredShift || offeredShift.id === desiredShift.id) continue;

      const status = swapStatuses[i]!;

      const [swap] = await db
        .insert(swap_requests)
        .values({
          organization_id: org.id,
          requester_id: requester.id,
          offered_shift_id: offeredShift.id,
          recipient_id: recipient.id,
          desired_shift_id: desiredShift.id,
          status,
          manager_id: status === 'approved' || status === 'rejected' ? managerUserId : null,
          resolved_at: status === 'approved' || status === 'rejected' ? new Date() : null,
          reason: 'Necesito cambiar turno por motivos personales',
          created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random within last week
        })
        .returning();

      if (swap) {
        createdSwaps.push(swap);
      }
    }

    console.log(`   ✓ Created ${createdSwaps.length} swap requests`);

    // 9. Create leave requests (3 total)
    console.log('\n🏖️ Creating leave requests (3 total)...');

    const leaveTypes: Array<{ type: 'vacation' | 'sick' | 'personal'; days: number; status: 'pending' | 'approved' | 'rejected' }> = [
      { type: 'vacation', days: 5, status: 'approved' },
      { type: 'sick', days: 2, status: 'pending' },
      { type: 'personal', days: 1, status: 'rejected' },
    ];

    const createdLeaves: Array<typeof leave_requests.$inferSelect> = [];

    for (const leaveData of leaveTypes) {
      const employee = employeeUsers[Math.floor(Math.random() * employeeUsers.length)];
      if (!employee) continue;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 30) + 5); // 5-35 days in future

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + leaveData.days - 1);

      const [leave] = await db
        .insert(leave_requests)
        .values({
          user_id: employee.id,
          organization_id: org.id,
          leave_type: leaveData.type,
          start_date: startDate,
          end_date: endDate,
          days_count: leaveData.days.toString(),
          reason: leaveData.type === 'vacation' ? 'Vacaciones familiares' : leaveData.type === 'sick' ? 'Enfermedad' : 'Asuntos personales',
          status: leaveData.status,
          requested_at: new Date(),
          approved_by: leaveData.status === 'approved' || leaveData.status === 'rejected' ? managerUserId : null,
          approved_at: leaveData.status === 'approved' || leaveData.status === 'rejected' ? new Date() : null,
          rejection_reason: leaveData.status === 'rejected' ? 'No hay cobertura disponible' : null,
          doctors_note_url: null,
          doctors_note_verified: false,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      if (leave) {
        createdLeaves.push(leave);
      }
    }

    console.log(`   ✓ Created ${createdLeaves.length} leave requests`);

    // Final summary
    console.log('\n✅ Seed complete!');
    console.log('━'.repeat(50));
    console.log('📊 Summary:');
    console.log(`   - Organization: ${org.name} (${org.slug})`);
    console.log(`   - Users: ${createdUsers.length} (2 managers, 8 employees)`);
    console.log(`   - Locations: 3 (Main Kitchen, Terrace, Storage)`);
    console.log(`   - Employee profiles: ${createdUsers.length} (with encrypted PII)`);
    console.log(`   - Shifts: ${createdShifts.length} (next 14 days)`);
    console.log(`   - Time entries: ${createdTimeEntries.length} (past week)`);
    console.log(`   - Swap requests: ${createdSwaps.length} (various statuses)`);
    console.log(`   - Leave requests: ${createdLeaves.length} (vacation, sick, personal)`);
    console.log('━'.repeat(50));
    console.log('\n🚀 Ready for development!');
    console.log('\n📧 Demo credentials:');
    console.log('   Email: carlos.lopez@demo.com');
    console.log('   Password: Demo123!');
    console.log('   Organization: demo-restaurant');
    console.log('\n🔗 Login at: http://localhost:5173/signin\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

seed();
