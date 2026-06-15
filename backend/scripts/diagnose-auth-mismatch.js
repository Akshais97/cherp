require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');

const supabaseUrl = process.env.SUPABASE_URL || 'https://xuojujpjnybocuukdgur.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is missing in env!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const prisma = new PrismaClient();

const targetEmails = [
  'akshaiofficial97@gmail.com',
  'akshaiindia97@gmail.com',
  'akshairofficial@gmail.com'
];

async function run() {
  console.log('--- DIAGNOSING AUTH MISMATCHES ---');
  for (const email of targetEmails) {
    console.log(`\nEmail: ${email}`);
    
    // 1. Fetch from Supabase Auth via admin API
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error('Supabase listUsers error:', authError.message);
      break;
    }
    const authUser = authData.users.find(u => u.email === email);
    if (!authUser) {
      console.log('  -> Not found in Supabase Auth!');
    } else {
      console.log('  -> Found in Supabase Auth! ID:', authUser.id);
      console.log('  -> Supabase User Metadata:', authUser.user_metadata);
    }
    
    // 2. Fetch from Database
    const dbUser = await prisma.user.findFirst({
      where: { email },
      select: {
        id: true,
        email: true,
        auth_user_id: true,
        role: { select: { name: true } },
        is_active: true
      }
    });
    
    if (!dbUser) {
      console.log('  -> Not found in Database!');
    } else {
      console.log('  -> Found in Database! ID:', dbUser.id);
      console.log('  -> auth_user_id in DB:', dbUser.auth_user_id);
      console.log('  -> Role in DB:', dbUser.role.name);
      console.log('  -> Active in DB:', dbUser.is_active);
      
      // Compare
      if (authUser && dbUser) {
        if (authUser.id !== dbUser.auth_user_id) {
          console.warn(`  [MISMATCH WARNING] Supabase Auth ID (${authUser.id}) does NOT match auth_user_id in DB (${dbUser.auth_user_id})!`);
        } else {
          console.log('  [MATCH] IDs match perfectly!');
        }
      }
    }
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
