import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // on a besoin de vérifier les policies rls via `pg_policies`
  const { data, error } = await supabase.rpc('exec_sql', { sql: "SELECT * FROM pg_policies WHERE tablename = 'clients';" });
  if (error) {
     console.log("Error directly querying pg_policies, let's look at recent SQL scripts");
  } else {
     console.log(data);
  }
}
run();
