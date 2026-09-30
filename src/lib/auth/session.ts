import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { cookies } from "next/headers";
import { jsonError } from "@/lib/api/respond";
import { authConfig, bearerToken } from "@/lib/auth/config";

// Id do usuário da sessão (cookie do navegador ou "Authorization: Bearer"),
// ou null se não há sessão válida. Não renova token: isso é papel do proxy.
async function sessionUserId(request: Request): Promise<string | null> {
  const config = authConfig();
  if (!config) throw new Error("SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY precisam estar definidas.");

  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("cookie") ?? "").map(
          ({ name, value }) => ({ name, value: value ?? "" })
        );
      },
      setAll() {},
    },
  });

  const { data, error } = await supabase.auth.getClaims(bearerToken(request));
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub;
}

// Primeira linha de toda rota da API. Devolve a resposta de recusa, ou null
// se a sessão é válida. Sem sessão: 401 e nenhum dado.
export async function requireUser(request: Request): Promise<Response | null> {
  try {
    if (await sessionUserId(request)) return null;
    return jsonError(401, "Sessão ausente ou expirada. Faça login.");
  } catch {
    return jsonError(500, "Autenticação não configurada no servidor.");
  }
}

// Cliente com a sessão do navegador, para Server Actions (login e logout).
export async function createSessionClient() {
  const config = authConfig();
  if (!config) throw new Error("SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY precisam estar definidas.");
  const cookieStore = await cookies();

  return createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Chamado de Server Component: o proxy renova a sessão.
        }
      },
    },
  });
}
