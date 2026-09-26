import type { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/respond";

type ReadJsonResult =
  | { ok: true; body: unknown }
  | { ok: false; response: NextResponse };

// Rótulos que o padrão WHATWG Encoding reconhece como UTF-8.
const UTF8_LABELS = new Set(["utf-8", "utf8"]);

// Lê o corpo JSON exigindo UTF-8 válido. request.json() troca bytes inválidos
// por U+FFFD sem avisar, e o texto corrompido acaba gravado no banco. Aqui o
// decoder é fatal: corpo fora de UTF-8 vira 400 antes de chegar em qualquer
// regra de negócio.
export async function readJsonBody(request: Request): Promise<ReadJsonResult> {
  const charset = charsetOf(request.headers.get("content-type"));
  if (charset !== null && !UTF8_LABELS.has(charset)) {
    return {
      ok: false,
      response: jsonError(
        400,
        `Charset "${charset}" não aceito. Envie o corpo em UTF-8 (Content-Type: application/json; charset=utf-8).`
      ),
    };
  }

  let text: string;
  try {
    const bytes = await request.arrayBuffer();
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return {
      ok: false,
      response: jsonError(
        400,
        "Corpo da requisição precisa estar em UTF-8 válido. Verifique a codificação do cliente que enviou (ex.: curl no Windows pode mandar Latin-1)."
      ),
    };
  }

  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, response: jsonError(400, "Corpo da requisição precisa ser JSON válido.") };
  }
}

// Sem charset declarado, vale UTF-8 (RFC 8259). Devolve null nesse caso.
function charsetOf(contentType: string | null): string | null {
  if (!contentType) return null;
  for (const param of contentType.split(";").slice(1)) {
    const [key, ...rest] = param.split("=");
    if (key.trim().toLowerCase() === "charset") {
      return rest.join("=").trim().replace(/^"|"$/g, "").toLowerCase();
    }
  }
  return null;
}
