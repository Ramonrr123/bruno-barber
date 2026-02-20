import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkAndIncrement } from "../_shared/rateLimit.ts";
import { getClientIp } from "../_shared/getClientIp.ts";

const LOGIN_LIMIT = 5;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não permitido." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const supabaseAnon = createClient(supabaseUrl, anonKey);

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Corpo da requisição inválido." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = (body.password || "").trim();
  if (!email || !password) {
    return new Response(
      JSON.stringify({ error: "Email e senha são obrigatórios." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const ip = getClientIp(req);
  const keyEmail = `login:email:${email}`;
  const keyIp = `login:ip:${ip}`;

  const shadowMode = Deno.env.get("RATE_LIMIT_SHADOW_MODE") === "true";
  let rateLimitAllowed = true;

  try {
    const [resultEmail, resultIp] = await Promise.all([
      checkAndIncrement(supabaseAdmin, keyEmail, LOGIN_LIMIT),
      checkAndIncrement(supabaseAdmin, keyIp, LOGIN_LIMIT),
    ]);
    rateLimitAllowed = resultEmail.allowed && resultIp.allowed;

    if (!rateLimitAllowed && shadowMode) {
      console.warn(
        `[RATE_LIMIT_SHADOW] Bloquearia login: email=${email}, ip=${ip} (shadow mode ativo)`
      );
      rateLimitAllowed = true;
    }
  } catch (err) {
    console.error("[RATE_LIMIT] Falha na verificação (fail open), permitindo login:", err);
    rateLimitAllowed = true;
  }

  if (!rateLimitAllowed) {
    return new Response(
      JSON.stringify({
        error: "Muitas tentativas de login. Por favor, aguarde 15 minutos para tentar novamente.",
      }),
      {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });

  if (error) {
    return new Response(
      JSON.stringify({
        error: error.message === "Invalid login credentials"
          ? "Email ou senha incorretos."
          : error.message,
      }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({
      session: data.session,
      user: data.user,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
