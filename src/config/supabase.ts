import { createClient } from "@supabase/supabase-js";

import type { Database } from "../types/database";
import { env } from "./env";

export const supabase = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
