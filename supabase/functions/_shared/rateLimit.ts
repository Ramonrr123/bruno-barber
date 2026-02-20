// Lógica de rate limit usando tabela rate_limit no Supabase.
// Chave = identificador (ex: booking:47999999999, login:email:user@x.com, login:ip:1.2.3.4).
// Janela fixa de 15 minutos; se a chave expirou, reinicia contagem.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const WINDOW_MINUTES = 15;

export async function checkAndIncrement(
  supabase: SupabaseClient,
  key: string,
  limit: number
): Promise<{ allowed: boolean }> {
  const now = new Date().toISOString();
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  const { data: row } = await supabase
    .from("rate_limit")
    .select("count, window_start")
    .eq("key", key)
    .single();

  if (!row) {
    await supabase.from("rate_limit").upsert(
      { key, count: 1, window_start: now },
      { onConflict: "key" }
    );
    return { allowed: true };
  }

  const existingStart = new Date(row.window_start).toISOString();
  if (existingStart < windowStart) {
    await supabase.from("rate_limit").upsert(
      { key, count: 1, window_start: now },
      { onConflict: "key" }
    );
    return { allowed: true };
  }

  if (row.count >= limit) {
    return { allowed: false };
  }

  await supabase
    .from("rate_limit")
    .update({ count: row.count + 1 })
    .eq("key", key);

  return { allowed: true };
}
