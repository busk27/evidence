import { logout } from "./login/actions";

export function SignOutButton() {
  return (
    <form action={logout}>
      <button type="submit" className="header-link cursor-pointer">
        Sair
      </button>
    </form>
  );
}
