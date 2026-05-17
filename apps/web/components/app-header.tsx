"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { clearSession, getSession } from "@/lib/api";
import type { StoredSession } from "@/lib/api";

export function AppHeader() {
  const router = useRouter();
  const qc = useQueryClient();
  const [session, setSession] = useState<StoredSession | null>(null);

  useEffect(() => {
    setSession(getSession());
  }, []);

  const logout = () => {
    clearSession();
    qc.clear();
    setSession(null);
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/dashboard" className="font-semibold">
            Safety & Response
          </Link>
          <Link href="/events" className="text-muted-foreground hover:text-foreground">
            事件
          </Link>
          <Link
            href="/notifications"
            className="text-muted-foreground hover:text-foreground"
          >
            通知
          </Link>
          {session?.user.role === "ADMIN" && (
            <>
              <Link
                href="/admin/events/new"
                className="text-muted-foreground hover:text-foreground"
              >
                建立事件
              </Link>
              <Link
                href="/admin/users"
                className="text-muted-foreground hover:text-foreground"
              >
                使用者
              </Link>
              <Link
                href="/admin/audit"
                className="text-muted-foreground hover:text-foreground"
              >
                稽核
              </Link>
            </>
          )}
        </nav>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {session && (
            <>
              <span className="hidden sm:inline">{session.user.name}</span>
              <span className="rounded bg-muted px-2 py-0.5">{session.user.role}</span>
              <Button variant="outline" size="sm" onClick={logout}>
                登出
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
