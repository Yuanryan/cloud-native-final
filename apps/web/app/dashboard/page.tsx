"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { apiFetch, getSession } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

type Me = {
  id: string;
  email: string;
  name: string;
  role: string;
  department: { id: string; name: string };
};

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getSession()) router.replace("/login");
  }, [router]);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<Me>("/auth/me"),
    enabled: typeof window !== "undefined" && !!getSession(),
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">儀表板</h1>
          <p className="text-muted-foreground">
            檢視進行中事件、通知與依角色提供的快捷操作。
          </p>
        </div>
        {me && (
          <Card>
            <CardHeader>
              <CardTitle>您好，{me.name}</CardTitle>
              <CardDescription>
                {me.email} · {me.role} · {me.department.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link href="/events" className={cn(buttonVariants())}>
                查看事件
              </Link>
              <Link
                href="/notifications"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                通知
              </Link>
              {me.role === "ADMIN" && (
                <>
                  <Link
                    href="/admin/events/new"
                    className={cn(buttonVariants({ variant: "secondary" }))}
                  >
                    建立事件
                  </Link>
                  <Link
                    href="/admin/users"
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    使用者管理
                  </Link>
                  <Link
                    href="/admin/audit"
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    稽核紀錄
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
