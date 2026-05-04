import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkAndIncrement } from "../_shared/rateLimit.ts";

const BOOKING_LIMIT = 3;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(phone: string): string {
  return (phone || "").replace(/\D/g, "").slice(-11) || "unknown";
}

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
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let body: {
    client_name?: string;
    client_phone?: string;
    service_type?: string;
    appointment_date?: string;
    start_time?: string;
    end_time?: string;
    status?: string;
    professional?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Corpo da requisição inválido." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const clientPhone = body.client_phone ? normalizePhone(body.client_phone) : "";
  if (!clientPhone || clientPhone.length < 10) {
    return new Response(
      JSON.stringify({ error: "Telefone do cliente é obrigatório e deve ser válido." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const rateLimitKey = `booking:${clientPhone}`;
  const shadowMode = Deno.env.get("RATE_LIMIT_SHADOW_MODE") === "true";
  let rateLimitAllowed = true;

  try {
    const result = await checkAndIncrement(supabase, rateLimitKey, BOOKING_LIMIT);
    rateLimitAllowed = result.allowed;

    if (!rateLimitAllowed && shadowMode) {
      console.warn(
        `[RATE_LIMIT_SHADOW] Bloquearia agendamento: telefone=${clientPhone} (shadow mode ativo)`
      );
      rateLimitAllowed = true;
    }
  } catch (err) {
    console.error(
      "[RATE_LIMIT] Falha na verificação (fail open), permitindo agendamento:",
      err
    );
    rateLimitAllowed = true;
  }

  if (!rateLimitAllowed) {
    return new Response(
      JSON.stringify({
        error: "Muitas tentativas de agendamento. Por favor, aguarde 15 minutos para tentar novamente.",
      }),
      {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const prof = typeof body.professional === "string" ? body.professional.trim() : "";

  const appointmentData = {
    client_name: (body.client_name || "").trim(),
    client_phone: body.client_phone?.replace(/\D/g, "") ?? clientPhone,
    service_type: (body.service_type || "").trim(),
    appointment_date: body.appointment_date || "",
    start_time: body.start_time || "",
    end_time: body.end_time || "",
    status: body.status || "confirmed",
    ...(prof ? { professional: prof } : {}),
  };

  if (
    !appointmentData.client_name ||
    !appointmentData.service_type ||
    !appointmentData.appointment_date ||
    !appointmentData.start_time ||
    !appointmentData.end_time
  ) {
    return new Response(
      JSON.stringify({ error: "Dados do agendamento incompletos." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data, error } = await supabase
    .from("appointments")
    .insert(appointmentData)
    .select()
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao criar agendamento." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
