import { describe, expect, it } from "vitest";
import { createFirmSchema } from "./create";

describe("createFirmSchema", () => {
  it("aceita firma só com nome", () => {
    expect(createFirmSchema.safeParse({ name: "Acme" }).success).toBe(true);
  });

  it("aceita firma com contato", () => {
    const result = createFirmSchema.safeParse({
      name: "Acme",
      country: "Brasil",
      size: "20 pessoas",
      contact: { name: "Ana", role: "Sócia" },
    });
    expect(result.success).toBe(true);
  });

  it("rejeita nome vazio", () => {
    expect(createFirmSchema.safeParse({ name: "  " }).success).toBe(false);
  });

  // Regra de negócio 3: stage não entra pela criação.
  it("rejeita stage no corpo", () => {
    const result = createFirmSchema.safeParse({ name: "Acme", stage: "assinou" });
    expect(result.success).toBe(false);
  });

  it("rejeita chave desconhecida dentro de contact", () => {
    const result = createFirmSchema.safeParse({
      name: "Acme",
      contact: { name: "Ana", stage: "assinou" },
    });
    expect(result.success).toBe(false);
  });

  it("rejeita contato sem nome", () => {
    const result = createFirmSchema.safeParse({ name: "Acme", contact: {} });
    expect(result.success).toBe(false);
  });
});
