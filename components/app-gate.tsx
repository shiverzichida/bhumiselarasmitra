"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Workspace } from "@/components/workspace";

const supabase = getSupabaseBrowserClient();

export function AppGate() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready">("checking");

  useEffect(() => {
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

  if (status === "checking") {
    return <div style={{ padding: 24, color: "#cbd5e1", background: "#0f172a", minHeight: "100vh" }}>Checking session...</div>;
  }

  return <Workspace />;
}
