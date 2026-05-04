import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env");

function loadEnv() {
  const env = {};
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
  return env;
}

const env = loadEnv();
const url =
  env.VITE_SUPABASE_URL ||
  env.SUPABASE_URL ||
  "";
const key =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  env.SUPABASE_ANON_KEY ||
  "";

console.log(
  `[config] URL: ${url ? `${url.slice(0, 24)}…` : "(ausente)"} | key: ${key ? "***" + key.slice(-4) : "(ausente)"}`
);

if (!url || !key) {
  console.error("❌ Falta VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY no .env");
  process.exit(1);
}

const supabase = createClient(url, key);

const [{ data: srv, error: e1 }, authHealth] = await Promise.all([
  supabase.from("services").select("id").limit(1),
  fetch(`${url}/auth/v1/health`, { headers: { apikey: key } }).then((r) => ({
    ok: r.ok,
    status: r.status,
  })),
]);

if (authHealth.ok) {
  console.log(`✅ Auth reachable: HTTP ${authHealth.status}`);
} else {
  console.log(`⚠️ Auth health: HTTP ${authHealth.status} (nem sempre disponível)`);
}

if (e1) {
  console.error("❌ PostgREST (tabela services):", e1.message, e1.code ?? "");
  process.exit(1);
}

console.log(`✅ PostgREST OK — services retornou ${srv?.length ?? 0} linha(s)`);
process.exit(0);
