import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig, bearerToken } from "@/lib/auth/config";

// Porta de entrada: renova a sessão e barra quem não está logado. Página sem
// sessão vai para /login; rota da API sem sessão recebe 401 sem dado nenhum.
// Cada rota da API checa a sessão de novo (requireUser): o proxy não é a
// única trava. Segue o padrão oficial do @supabase/ssr para Next.js.
export async function proxy(request: NextRequest) {
  const isApi = request.nextUrl.pathname.startsWith("/api");
  const isLogin = request.nextUrl.pathname === "/login";

  const config = authConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Autenticação não configurada no servidor." },
      { status: 500 }
    );
  }

  const token = bearerToken(request);
  let response = NextResponse.next({ request });

  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value)
        );
      },
    },
  });

  // Nada entre createServerClient e getClaims (recomendação do Supabase).
  const { data } = await supabase.auth.getClaims(token);
  const signedIn = Boolean(data?.claims?.sub);

  if (!signedIn && isApi) {
    return NextResponse.json(
      { error: "Sessão ausente ou expirada. Faça login." },
      { status: 401 }
    );
  }

  if (!signedIn && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (signedIn && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/firms";
    url.search = "";
    const redirect = NextResponse.redirect(url);
    // Mantém os cookies de sessão renovados neste mesmo request.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos e a documentação pública da API
    // (llms.txt e openapi.json descrevem a API, não trazem dado).
    "/((?!_next/static|_next/image|favicon.ico|llms.txt|openapi.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
