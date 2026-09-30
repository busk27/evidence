// Sessão via Supabase Auth, com a chave publicável (nunca a service role).
// A chave fica só no servidor: login, logout e checagem rodam no backend.
export function authConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export function bearerToken(request: Request): string | undefined {
  return request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
}
