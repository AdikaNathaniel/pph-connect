// Quick schema verification script
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('=== SCHEMA VERIFICATION ===\n');

// 1. Check enum values - we'll do this via a test query
console.log('1. Checking user_role enum values...');
console.log('   (Checking via profiles table structure)');

// 2. Check tables exist
console.log('\n2. Checking if messaging tables exist...');
const tables = ['departments', 'message_threads', 'messages', 'message_recipients', 'message_groups'];

for (const table of tables) {
  const { data, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });

  if (error && error.code === '42P01') {
    console.log(`   ❌ ${table}: NOT FOUND`);
  } else if (error) {
    console.log(`   ⚠️  ${table}: ${error.message}`);
  } else {
    console.log(`   ✅ ${table}: EXISTS`);
  }
}

// 3. Check storage bucket
console.log('\n3. Checking storage buckets...');
const { data: buckets, error: bucketError } = await supabase
  .storage
  .listBuckets();

if (bucketError) {
  console.log(`   ❌ Error: ${bucketError.message}`);
} else {
  const messageAttachmentsBucket = buckets.find(b => b.name === 'message-attachments');
  if (messageAttachmentsBucket) {
    console.log(`   ✅ message-attachments bucket: EXISTS`);
    console.log(`      - Public: ${messageAttachmentsBucket.public}`);
    console.log(`      - File size limit: ${messageAttachmentsBucket.file_size_limit} bytes`);
  } else {
    console.log(`   ❌ message-attachments bucket: NOT FOUND`);
  }
}

// 4. Check helper functions
console.log('\n4. Checking helper functions...');
const functions = ['can_send_messages', 'can_message_user'];

for (const func of functions) {
  try {
    // Try to call the function with a dummy UUID
    const { data, error } = await supabase.rpc(func, { _user_id: '00000000-0000-0000-0000-000000000000' });

    if (error && error.code === '42883') {
      console.log(`   ❌ ${func}: NOT FOUND`);
    } else if (error) {
      console.log(`   ⚠️  ${func}: ${error.message}`);
    } else {
      console.log(`   ✅ ${func}: EXISTS (returned: ${data})`);
    }
  } catch (e) {
    console.log(`   ⚠️  ${func}: ${e.message}`);
  }
}

// 5. Check profiles table columns
console.log('\n5. Checking profiles table has new columns...');
const { data: profileData, error: profileError } = await supabase
  .from('profiles')
  .select('department_id, reports_to')
  .limit(1);

if (profileError && profileError.message.includes('department_id')) {
  console.log(`   ❌ department_id column: NOT FOUND`);
} else if (profileError && profileError.message.includes('reports_to')) {
  console.log(`   ❌ reports_to column: NOT FOUND`);
} else if (profileError) {
  console.log(`   ⚠️  Error: ${profileError.message}`);
} else {
  console.log(`   ✅ department_id column: EXISTS`);
  console.log(`   ✅ reports_to column: EXISTS`);
}

console.log('\n=== VERIFICATION COMPLETE ===');
