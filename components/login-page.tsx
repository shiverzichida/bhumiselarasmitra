"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import logoImage from "@/logo-bsm.png";
import { getSupabaseBrowserClient, getSupabaseConfig } from "@/lib/supabase";
import styles from "./login-page.module.css";

const supabase = getSupabaseBrowserClient();
const { isConfigured } = getSupabaseConfig();

export function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("ops-demo@bhumidocs.com");
  const [password, setPassword] = useState("BhumiDocs#2026");
  const [status, setStatus] = useState("Masuk dengan akun Supabase Anda.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/");
      }
    });
  }, [router]);

  async function signIn() {
    if (!supabase) {
      setStatus("Supabase environment variables belum dipasang di Vercel atau .env.local.");
      return;
    }
    setBusy(true);
    setStatus("Signing in...");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) {
      setStatus(`Login gagal: ${error.message}`);
      return;
    }
    setStatus("Login berhasil. Mengarahkan ke dashboard...");
    router.replace("/");
  }

  async function registerDemoUser() {
    if (!supabase) {
      setStatus("Supabase environment variables belum dipasang di Vercel atau .env.local.");
      return;
    }
    setBusy(true);
    setStatus("Registering demo user...");
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) {
      setStatus(`Register gagal: ${error.message}`);
      return;
    }
    if (data.user && !data.session) {
      setStatus("User dibuat. Jika project meminta verifikasi email, konfirmasi dulu lalu login.");
      return;
    }
    setStatus("Demo user siap dipakai. Mengarahkan ke dashboard...");
    router.replace("/");
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.brand}>
          <img src={logoImage.src} alt="Bhumi logo" />
          <div>
            <h1>PT. Bhumi Selaras Mitra</h1>
            <p>B/L Management System</p>
          </div>
        </div>

        <div className={styles.headline}>
          <p className={styles.eyebrow}>Modern Operations Console</p>
          <h2>Shipping instruction, bill of lading, dan invoice dalam satu workspace.</h2>
        </div>
      </section>

      <section className={styles.panelWrap}>
        <div className={styles.panel}>
          <p className={styles.eyebrow}>Secure Login</p>
          <h2>Masuk ke workspace</h2>
          <p>Gunakan akun operasional atau akun demo yang sudah Anda buat di Supabase.</p>
          {!isConfigured && (
            <p className={styles.warning}>Supabase belum terkonfigurasi. Tambahkan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`.</p>
          )}

          <div className={styles.form}>
            <label className={styles.field}>
              <span>Email</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" />
            </label>
            <label className={styles.field}>
              <span>Password</span>
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
            </label>
            <div className={styles.actions}>
              <button className={styles.primary} onClick={() => void signIn()} type="button" disabled={busy}>
                Login
              </button>
              <button className={styles.secondary} onClick={() => void registerDemoUser()} type="button" disabled={busy}>
                Register Demo User
              </button>
            </div>
            <p className={styles.status}>{status}</p>
            <p className={styles.hint}>Demo login: `ops-demo@bhumidocs.com` / `BhumiDocs#2026`</p>
          </div>
        </div>
      </section>
    </main>
  );
}
