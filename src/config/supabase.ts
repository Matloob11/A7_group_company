import { createClient } from "@supabase/supabase-js";

import type { Database } from "../types/database";
import { env } from "./env";

let _client: any = null;

function initClient() {
  if (_client) return _client;

  const url = env.SUPABASE_URL || "";
  const key = env.SUPABASE_SERVICE_ROLE_KEY || "";

  _client = createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _client;
}

export const getSupabase = () => initClient();

// Backwards-compatible `supabase` export: a lazy proxy that initializes on first use.
// This lets existing files that import `{ supabase }` keep working without change.
export const supabase: any = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = initClient();
      // @ts-ignore
      return (client as any)[prop];
    },
    apply(_target, thisArg, args) {
      const client = initClient();
      // @ts-ignore
      return (client as any).apply(thisArg, args);
    },
  },
);
