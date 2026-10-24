// Shared HTTP helpers for the Satya Edge Functions (Deno runtime).

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}

/** Map a Postgres/PostgREST error to a safe user-facing message and HTTP status. */
export function fromDbError(error: { message?: string; code?: string } | null): Response {
  const code = error?.code;
  const status = code === '42501' ? 401 : code === '0A000' ? 409 : code === '23505' ? 409 : code === '23514' ? 422 : 400;
  return json({ error: error?.message || 'Request could not be completed.' }, status);
}
