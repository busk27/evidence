import { beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Se a rota tocar no banco sem sessão, o teste quebra aqui.
const dbAccess = vi.fn(() => {
  throw new Error("rota acessou o banco sem sessão");
});
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: dbAccess }));

beforeAll(() => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
});

describe("/api/thesis exige sessão", () => {
  it("GET sem sessão → 401 sem a tese", async () => {
    const { GET } = await import("@/app/api/thesis/route");
    const response = await GET(new NextRequest("http://localhost/api/thesis"));
    expect(response.status).toBe(401);
    expect(Object.keys(await response.json())).not.toContain("thesis");
    expect(dbAccess).not.toHaveBeenCalled();
  });

  it("PUT sem sessão → 401 e nada é salvo", async () => {
    const { PUT } = await import("@/app/api/thesis/route");
    const response = await PUT(
      new NextRequest("http://localhost/api/thesis", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "tese de teste" }),
      })
    );
    expect(response.status).toBe(401);
    expect(dbAccess).not.toHaveBeenCalled();
  });
});
