// deno-lint-ignore no-explicit-any
export async function shouldBccAdmin(supabase: any, tipo: string, fallback: boolean): Promise<boolean> {
  const { data } = await supabase
    .from("email_bcc_settings")
    .select("bcc_admin")
    .eq("tipo", tipo)
    .maybeSingle();
  return data?.bcc_admin ?? fallback;
}
