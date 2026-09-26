import { describe, expect, it } from "vitest";
import { readJsonBody } from "./read-json";

function post(body: BodyInit, contentType = "application/json") {
  return new Request("http://localhost/api/firms", {
    method: "POST",
    headers: { "content-type": contentType },
    body,
  });
}

describe("readJsonBody", () => {
  it("aceita UTF-8 com acento e preserva o texto", async () => {
    const result = await readJsonBody(post(JSON.stringify({ name: "Ática", contato: "André" })));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.body).toEqual({ name: "Ática", contato: "André" });
  });

  // O caso real: curl do Git Bash no Windows mandou "Ática" em Latin-1 e a
  // firma foi gravada como "�tica".
  it("recusa corpo em Latin-1 com 400 em vez de gravar U+FFFD", async () => {
    const latin1 = Buffer.from('{"name":"\xC1tica"}', "latin1");
    const result = await readJsonBody(post(latin1));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      expect((await result.response.json()).error).toMatch(/UTF-8/);
    }
  });

  it("recusa charset declarado diferente de utf-8", async () => {
    const result = await readJsonBody(
      post(JSON.stringify({ name: "Acme" }), "application/json; charset=ISO-8859-1")
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      expect((await result.response.json()).error).toMatch(/iso-8859-1/);
    }
  });

  it("recusa JSON malformado com 400", async () => {
    const result = await readJsonBody(post('{"name": "Acme"'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      expect((await result.response.json()).error).toMatch(/JSON válido/);
    }
  });
});
