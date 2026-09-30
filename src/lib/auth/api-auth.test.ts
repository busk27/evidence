import { readdirSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Se alguma rota tocar no banco sem sessão, o teste quebra aqui.
const dbAccess = vi.fn(() => {
  throw new Error("rota acessou o banco sem sessão");
});
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: dbAccess }));
vi.mock("@/lib/extraction/extract", () => ({
  extractFactsFromDump: vi.fn(() => {
    throw new Error("rota chamou o modelo sem sessão");
  }),
}));

const API_DIR = path.resolve(__dirname, "../../app/api");
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const SOME_ID = "6035e621-61cb-4706-9fb9-89eb657859fb";

// Todas as rotas da API, achadas no disco: rota nova entra no teste sozinha.
function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return routeFiles(full);
    return entry.name === "route.ts" ? [full] : [];
  });
}

function urlFor(file: string) {
  const route = path
    .relative(path.resolve(__dirname, "../../app"), path.dirname(file))
    .split(path.sep)
    .join("/")
    .replace("[id]", SOME_ID);
  return `http://localhost/${route}`;
}

// Só os métodos que cada rota exporta de fato.
const cases = (
  await Promise.all(
    routeFiles(API_DIR).map(async (file) => {
      const mod = await import(file);
      return METHODS.filter((m) => typeof mod[m] === "function").map((method) => ({
        file: path.relative(API_DIR, file).split(path.sep).join("/"),
        method,
        handler: mod[method],
        url: urlFor(file),
      }));
    })
  )
).flat();

beforeAll(() => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
});

describe("toda rota da API exige sessão", () => {
  it("encontra todos os handlers da API", () => {
    expect(cases.length).toBeGreaterThanOrEqual(7);
  });

  const credentials: { name: string; headers: Record<string, string> }[] = [
    { name: "sem cookie nem token", headers: {} },
    { name: "com token inválido", headers: { authorization: "Bearer isto-nao-e-um-jwt" } },
  ];

  for (const { name, headers } of credentials) {
    it.each(cases)(`$method $file ${name} → 401 sem dado`, async ({ method, handler, url }) => {
      const request = new NextRequest(url, {
        method,
        headers: { "content-type": "application/json", ...headers },
        body: method === "GET" ? undefined : JSON.stringify({}),
      });
      const response: Response = await handler(request, {
        params: Promise.resolve({ id: SOME_ID }),
      });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(Object.keys(body).filter((k) => body[k] !== undefined)).toEqual(["error"]);
      expect(dbAccess).not.toHaveBeenCalled();
    });
  }
});

describe("proxy", () => {
  it("API sem sessão → 401", async () => {
    const { proxy } = await import("@/proxy");
    const response = await proxy(new NextRequest("http://localhost/api/firms"));
    expect(response.status).toBe(401);
  });

  it("página sem sessão → /login", async () => {
    const { proxy } = await import("@/proxy");
    const response = await proxy(new NextRequest("http://localhost/firms"));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
  });

  it("/login sem sessão abre normalmente", async () => {
    const { proxy } = await import("@/proxy");
    const response = await proxy(new NextRequest("http://localhost/login"));
    expect(response.headers.get("location")).toBeNull();
  });
});
