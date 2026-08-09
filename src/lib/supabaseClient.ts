import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = "https://huatkwptvhmquwyfhyry.supabase.co";
const supabaseAnonKey =
  "sb_publishable_FnEYay_n60cTpo8LerhF-Q_4Wz69JfT";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);