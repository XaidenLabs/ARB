/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAuthUsers() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error("Error fetching users:", error);
  } else {
    if (users && users.length > 0) {
        console.log("Sample User Data keys:", Object.keys(users[0]));
        console.log("Last Sign In IP:", users[0].last_sign_in_ip);
        // Check if metadata contains location
        console.log("User Metadata:", users[0].user_metadata);
    } else {
        console.log("No users found.");
    }
  }
}

checkAuthUsers();
