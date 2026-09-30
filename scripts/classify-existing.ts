// Classifica pela tese salva os fatos válidos que já existem no banco.
// Só grava thesis_signal e thesis_reason; não muda texto, verbatim, status nem
// correção de nenhum fato. A tese vem do banco (tabela thesis), nunca daqui.
//
// Uso (na raiz do projeto):
//   $env:JITI_ALIAS='{"@":"./src"}'; npx jiti scripts/classify-existing.ts            (simulação)
//   $env:JITI_ALIAS='{"@":"./src"}'; npx jiti scripts/classify-existing.ts --write    (grava)
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { readFactsAgainstThesis, type FactToRead } from "@/lib/extraction/extract";
import { acceptThesisReading } from "@/lib/thesis/signal";
import { loadThesis } from "@/lib/thesis/store";
import type { ProfileField } from "@/lib/domain";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const WRITE = process.argv.includes("--write");
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

async function main() {
  const thesis = await loadThesis(supabase);
  if (!thesis?.text.trim()) {
    console.error("Nenhuma tese salva. Salve a tese em /tese antes de classificar.");
    process.exitCode = 1;
    return;
  }
  console.log(`Tese salva em ${thesis.updated_at}.`);

  const { data: facts, error } = await supabase
    .from("facts")
    .select("id, firm_id, conversation_id, field, statement, verbatim, confidence, firms(name), conversations(raw_dump)")
    .eq("status", "valid")
    .order("created_at");
  if (error) throw new Error(error.message);

  // Uma chamada por conversa: o modelo lê os fatos junto com o despejo de origem.
  const byConversation = new Map<string, typeof facts>();
  for (const fact of facts ?? []) {
    const list = byConversation.get(fact.conversation_id) ?? [];
    list.push(fact);
    byConversation.set(fact.conversation_id, list);
  }

  const tally = { alinhado: 0, explorar: 0, atencao: 0, sem: 0 };
  for (const [, group] of byConversation) {
    const firmName = (group[0].firms as unknown as { name: string }).name;
    const rawDump = (group[0].conversations as unknown as { raw_dump: string }).raw_dump;
    const readings = await readFactsAgainstThesis({
      thesis: thesis.text,
      rawDump,
      facts: group.map(
        (f): FactToRead => ({
          id: f.id,
          field: f.field as ProfileField,
          statement: f.statement,
          verbatim: f.verbatim,
          confidence: f.confidence,
        })
      ),
    });
    const byId = new Map(readings.map((r) => [r.id, r]));

    console.log(`\n== ${firmName} (${group.length} fatos válidos) ==`);
    for (const fact of group) {
      const raw = byId.get(fact.id);
      const reading = acceptThesisReading(raw?.thesis_signal, raw?.thesis_reason, thesis.text);
      tally[reading.thesis_signal ?? "sem"]++;
      console.log(`${fact.id.slice(0, 8)} ${fact.field}: ${reading.thesis_signal ?? "sem classificação"}`);
      if (reading.thesis_reason) console.log(`    ${reading.thesis_reason}`);

      if (WRITE) {
        const { error: updateError } = await supabase
          .from("facts")
          .update(reading)
          .eq("id", fact.id)
          .eq("status", "valid");
        if (updateError) throw new Error(`${fact.id}: ${updateError.message}`);
      }
    }
  }

  console.log(`\nTotal: ${JSON.stringify(tally)}`);
  console.log(WRITE ? "Gravado." : "Simulação: nada gravado. Rode com --write para gravar.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
