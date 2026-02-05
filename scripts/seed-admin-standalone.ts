import postgres from 'postgres';
import { createHash } from 'crypto';

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || 'john@lsltgroup.es';
  const password = process.env.ADMIN_PASSWORD || 'Summer15';
  const name = 'Platform Admin';
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL must be set');
    process.exit(1);
  }

  const sql = postgres(databaseUrl);

  try {
    console.log(`⏳ Checking for existing admin user: ${email}`);

    // Check if admin already exists
    const existing = await sql`
      SELECT id FROM "user" WHERE email = ${email} LIMIT 1
    `;

    if (existing.length > 0) {
      console.log(`✅ Admin user already exists: ${email}`);
      console.log(`   User ID: ${existing[0].id}`);
      await sql.end();
      return;
    }

    console.log(`⏳ Creating admin user...`);

    // Generate user ID
    const userId = crypto.randomUUID();

    // Hash password (SHA-256 for initial setup, Better Auth will re-hash on login)
    const passwordHash = createHash('sha256').update(password).digest('hex');

    // Create user
    await sql`
      INSERT INTO "user" (id, email, name, "emailVerified", image, "createdAt", "updatedAt")
      VALUES (
        ${userId},
        ${email},
        ${name},
        ${true},
        ${null},
        ${new Date()},
        ${new Date()}
      )
    `;

    console.log(`✅ User created: ${email}`);

    // Create account with password
    await sql`
      INSERT INTO account (id, "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", scope, password, "createdAt", "updatedAt")
      VALUES (
        ${crypto.randomUUID()},
        ${userId},
        ${'credential'},
        ${userId},
        ${null},
        ${null},
        ${null},
        ${null},
        ${null},
        ${null},
        ${passwordHash},
        ${new Date()},
        ${new Date()}
      )
    `;

    console.log(`✅ Password account created`);
    console.log(`\n🎉 Admin user ready!`);
    console.log(`   Email: ${email}`);
    console.log(`   Login at: https://time.lsltgroup.es/signin`);

    await sql.end();
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    await sql.end();
    process.exit(1);
  }
}

seedAdmin().then(() => process.exit(0));
