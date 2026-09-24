import { redirect } from "next/navigation";
import {
  hasOperatorSession,
  isSingleUserAccessConfigured
} from "@/lib/single-user-auth";
import styles from "./login.module.css";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!isSingleUserAccessConfigured()) {
    redirect("/dashboard");
  }

  if (await hasOperatorSession()) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const invalid = params.error === "1";

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.mark}>A</span>
          <div>
            <strong>Affiliate Machine</strong>
            <span>Acesso privado</span>
          </div>
        </div>

        <div className={styles.copy}>
          <span className={styles.eyebrow}>PAINEL OPERACIONAL</span>
          <h1>Entre para continuar.</h1>
          <p>
            Este painel é privado e foi configurado para um único operador.
          </p>
        </div>

        <form action="/api/auth/login" method="post" className={styles.form}>
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            placeholder="Sua senha de acesso"
          />

          {invalid ? (
            <p className={styles.error}>Senha inválida. Tente novamente.</p>
          ) : null}

          <button type="submit">Entrar no painel</button>
        </form>

        <div className={styles.safety}>
          <i />
          <span>Cookie HttpOnly · sessão de 30 dias · banco server-side</span>
        </div>
      </section>
    </main>
  );
}
