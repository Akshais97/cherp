require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in env!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const prisma = new PrismaClient();

const targetUsers = [
  { email: 'akshaiofficial97@gmail.com', designation: 'Super Admin' },
  { email: 'akshaiindia97@gmail.com', designation: 'Client Partner' },
  { email: 'akshairofficial@gmail.com', designation: 'Account Manager' }
];

async function findAuthUserByEmail(email) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100
    });
    if (error) {
      console.error('listUsers error:', error.message);
      return null;
    }
    if (!data.users || data.users.length === 0) {
      return null;
    }
    const found = data.users.find(u => u.email === email);
    if (found) return found;
    page++;
  }
}

async function run() {
  console.log('--- STARTING E2E AUTH USER SYNC (PAGINATED) ---');

  for (const target of targetUsers) {
    const email = target.email;
    console.log(`\nProcessing user: ${email}`);

    let authUser = await findAuthUserByEmail(email);
    
    if (!authUser) {
      console.log(`  -> User not found in Supabase Auth list. Attempting to create user...`);
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: 'SakhaaOnTop123',
        email_confirm: true,
        user_metadata: { full_name: email.split('@')[0] }
      });

      if (createError) {
        console.error(`  -> Failed to create user:`, createError.message);
        continue;
      }

      authUser = createData.user;
      console.log(`  -> Created successfully! Supabase ID: ${authUser.id}`);
    } else {
      console.log(`  -> Found in Supabase Auth! Supabase ID: ${authUser.id}`);
    }

    // Now update database record
    const dbUser = await prisma.user.findFirst({
      where: { email }
    });

    if (!dbUser) {
      console.warn(`  -> WARNING: User ${email} not found in PostgreSQL DB!`);
      continue;
    }

    if (dbUser.auth_user_id !== authUser.id) {
      console.log(`  -> DB auth_user_id mismatch (${dbUser.auth_user_id} vs ${authUser.id}). Updating...`);
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { auth_user_id: authUser.id }
      });
      console.log(`  -> Successfully updated auth_user_id in DB!`);
    } else {
      console.log(`  -> DB auth_user_id matches perfectly.`);
    }

    // Update designation to ensure E2E roles work
    console.log(`  -> Setting designation to: ${target.designation}`);
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { designation: target.designation }
    });
  }

  console.log('\n--- SYNC COMPLETED ---');
}

run().catch(console.error).finally(() => prisma.$disconnect());
