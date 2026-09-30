"use server";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/auth/session";

export type LoginState = { error: string } | undefined;

// Só login: não existe cadastro pelo site. Usuário é criado no painel do Supabase.
export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Preencha e-mail e senha." };

  let supabase;
  try {
    supabase = await createSessionClient();
  } catch {
    return { error: "Autenticação não configurada no servidor." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // O Supabase não diz se o erro foi no e-mail ou na senha, de propósito.
    if (error.code === "invalid_credentials") {
      return { error: "E-mail ou senha incorretos. Confira e tente de novo." };
    }
    if (error.code === "email_not_confirmed") {
      return { error: "Este e-mail ainda não foi confirmado no Supabase." };
    }
    return { error: "Não consegui entrar agora. Tente de novo em instantes." };
  }

  redirect("/firms");
}

export async function logout() {
  try {
    const supabase = await createSessionClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Sem configuração não há sessão para encerrar.
  }
  redirect("/login");
}
