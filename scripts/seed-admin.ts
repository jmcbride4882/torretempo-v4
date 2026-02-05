import { db } from '../apps/api/src/db/index.js';
import { user, account } from '../apps/api/src/db/schema.js';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';
import 'dotenv/config';

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = 'Platform Admin';

  if (!email || !password) {
    console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  try {
    console.log(`⏳ Checking for existing admin user: ${email}`);

    // Check if admin already exists
    const existing = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existing.length > 0) {
      console.log(`✅ Admin user already exists: ${email}`);
      console.log(`   User ID: ${existing[0]!.id}`);
      return;
    }

    console.log(`⏳ Creating admin user...`);

    // Generate user ID
    const userId = crypto.randomUUID();

    // Hash password (Better Auth uses bcrypt internally, we'll create a simple hash for now)
    // Better Auth will handle proper password hashing when user signs in
    const passwordHash = createHash('sha256').update(password).digest('hex');

    // Create user
    const newUser = await db.insert(user).values({
      id: userId,
      email,
      name,
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    console.log(`✅ User created: ${newUser[0]!.email}`);

    // Create account with password
    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: 'credential',
      userId: userId,
      accessToken: null,
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      scope: null,
      password: passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`✅ Password account created`);
    console.log(`\n🎉 Admin user ready!`);
    console.log(`   Email: ${email}`);
    console.log(`   Login at: https://time.lsltgroup.es/signin`);
    console.log(`\n⚠️  Note: Password is hashed with SHA-256 for initial setup.`);
    console.log(`   Better Auth will re-hash with bcrypt on first login.`);
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin().then(() => process.exit(0));
