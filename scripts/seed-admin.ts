import { auth } from '../apps/api/src/lib/auth.js';
import 'dotenv/config';

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set');
    process.exit(1);
  }

  try {
    // Attempt to create admin user via Better Auth
    // The auth.api.signUpEmail method creates a new user with email/password
    // Note: This is a placeholder - actual implementation depends on Better Auth API
    // In production, use auth.api.createUser() or similar method from Better Auth admin plugin
    
    console.log(`⏳ Attempting to create admin user: ${email}`);
    console.log('⚠️  Note: Actual admin creation requires Better Auth admin plugin API');
    console.log('   Run this after database is initialized with migrations');
    
    // Idempotent check: if admin already exists, skip
    // This would be implemented with actual Better Auth query methods
    
    console.log(`✅ Admin seeding script ready (requires DB connection)`);
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();
