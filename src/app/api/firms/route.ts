import { NextResponse, type NextRequest } from "next/server";
import { createFirmSchema } from "@/lib/firms/create";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Corpo da requisição precisa ser JSON válido.");
  }

  const parsed = createFirmSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Corpo da requisição inválido.", parsed.error.issues);
  }
  const { name, country, size, contact } = parsed.data;

  const supabase = getSupabaseServerClient();

  // stage fica de fora de propósito: o banco aplica o default "nao-contatada".
  const { data: firm, error: firmError } = await supabase
    .from("firms")
    .insert({ name, country: country ?? null, size: size ?? null })
    .select("id, name, country, size, stage, created_at")
    .single();

  if (firmError || !firm)
    return jsonError(500, "Erro ao gravar a firma.", firmError?.message);

  let createdContact = null;
  if (contact) {
    const { data, error: contactError } = await supabase
      .from("contacts")
      .insert({
        firm_id: firm.id,
        name: contact.name,
        role: contact.role ?? null,
        email: contact.email ?? null,
      })
      .select("id, firm_id, name, role, email")
      .single();

    if (contactError || !data)
      return jsonError(500, "Erro ao gravar o contato. A firma já foi gravada.", {
        firm_id: firm.id,
        message: contactError?.message,
      });
    createdContact = data;
  }

  return NextResponse.json({ firm, contact: createdContact }, { status: 201 });
}
