import { logout } from "./login/actions";

export function SignOutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="rounded-full border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-700 hover:border-zinc-500 hover:text-black dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-50"
      >
        Sair
      </button>
    </form>
  );
}
