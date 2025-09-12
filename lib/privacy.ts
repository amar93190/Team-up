import { supabase } from "@/config/supabase";

export async function exportUserData(): Promise<any> {
  const { data, error } = await supabase.rpc("export_user_data");
  if (error) throw error;
  return data ?? {};
}

export async function deleteUserAccount(): Promise<void> {
  const { error } = await supabase.rpc("delete_user_account");
  if (error) throw error;
}


