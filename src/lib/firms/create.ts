import { z } from "zod";

// Corpo aceito por POST /api/firms. strictObject: qualquer chave fora deste
// shape é rejeitada com 400 — inclusive "stage". Toda firma nasce em
// "nao-contatada" (default do banco); mudar estágio é ação explícita do
// usuário por endpoint dedicado, nunca parte da criação (regra de negócio 3).
export const createFirmSchema = z.strictObject({
  name: z.string().trim().min(1, "name não pode ser vazio"),
  country: z.string().trim().min(1).nullable().optional(),
  size: z.string().trim().min(1).nullable().optional(),
  // Contato opcional, criado junto com a firma.
  contact: z
    .strictObject({
      name: z.string().trim().min(1, "contact.name não pode ser vazio"),
      role: z.string().trim().min(1).nullable().optional(),
      email: z.email().nullable().optional(),
    })
    .optional(),
});

export type CreateFirmInput = z.infer<typeof createFirmSchema>;
