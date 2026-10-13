import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/AuthForm";
import { Dashboard } from "@/components/Dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BulkLedger — Clean Bulk & Personal Expense Tracker" },
      { name: "description", content: "Log expenses, track burn rate, safe daily allowance and bulk vs discretionary spend." },
      { property: "og:title", content: "BulkLedger — Clean Bulk & Personal Expense Tracker" },
      { property: "og:description", content: "Budget your bulk: burn rate, safe daily allowance and category alerts in ₹." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!ready) return <div className="min-h-screen" />;
  return session ? <Dashboard userId={session.user.id} email={session.user.email ?? ""} /> : <AuthForm />;
}
