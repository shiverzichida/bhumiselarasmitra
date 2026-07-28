"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient, getSupabaseConfig } from "@/lib/supabase";
import { Workspace } from "@/components/workspace";

const supabase = getSupabaseBrowserClient();
const { isConfigured } = getSupabaseConfig();

export function AppGate() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready">("checking");

  useEffect(() => {
    if (!supabase) {
      router.replace("/login");
      return;
    }

    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setStatus("ready");
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [router]);

  if (!isConfigured) {
    return <div style={{ padding: 24, color: "#cbd5e1", background: "#0f172a", minHeight: "100vh" }}>Supabase belum dikonfigurasi.</div>;
  }

  if (status === "checking") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0b0f19", color: "#f8fafc", fontFamily: "sans-serif" }}>
        <div style={{ width: "48px", height: "48px", border: "4px solid rgba(59, 130, 246, 0.2)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <p style={{ marginTop: "16px", color: "#94a3b8", fontSize: "14px", fontWeight: 500 }}>Memverifikasi Sesi Operasional...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return <Workspace />;
}
