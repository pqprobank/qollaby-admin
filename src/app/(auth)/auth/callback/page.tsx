"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { logAuthDebug } from "@/lib/auth";
import { Loader2, Shield } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { completeOAuthLogin, error } = useAuth();
  const hasRun = useRef(false);

  useEffect(() => {
    // Prevent double execution in React strict mode
    if (hasRun.current) return;
    hasRun.current = true;

    async function handleCallback() {
      try {
        await logAuthDebug("oauth_callback_page_loaded", {
          search: window.location.search,
        });
        await completeOAuthLogin();
        router.replace("/");
      } catch (error) {
        await logAuthDebug("oauth_callback_page_redirecting_to_login", {
          error: error instanceof Error ? error.message : String(error),
        });
        // Error is handled by context, redirect to login
        router.replace("/login?error=oauth_failed");
      }
    }

    handleCallback();
  }, [completeOAuthLogin, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      {/* Animated logo */}
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25 animate-pulse">
        <Shield className="w-10 h-10 text-primary-foreground" />
      </div>

      {error ? (
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">{error}</p>
          <p className="text-muted-foreground text-sm">Redirecting to login...</p>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Verifying identity...</span>
        </div>
      )}
    </div>
  );
}

