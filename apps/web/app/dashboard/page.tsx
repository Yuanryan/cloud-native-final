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
import { Badge } from "@/components/ui/badge";

type Me = {
  id: string;
  email: string;
  name: string;
  role: string;
  department: { id: string; name: string };
};

type EventRow = {
  id: string;
  title: string;
  status: "DRAFT" | "ACTIVE" | "CLOSED";
};

type StatsResult = {
  total: number;
  responded: number;
  safe: number;
  need_help: number;
  no_response: number;
};

function EventStatCard({ event }: { event: EventRow }) {
  const { data: stats } = useQuery({
    queryKey: ["stats", event.id],
    queryFn: () => apiFetch<StatsResult>(`/events/${event.id}/stats`),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{event.title}</CardTitle>
          <Badge variant="default">ACTIVE</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {stats ? (
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-muted-foreground">應回報</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {stats.responded}
              </p>
              <p className="text-muted-foreground">已回報</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">
                {stats.no_response}
              </p>
              <p className="text-muted-foreground">未回報</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">載入中…</p>
        )}
        <div className="mt-3">
          <Link
            href={`/events/${event.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
          >
            查看團隊回報
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

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

  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: () => apiFetch<EventRow[]>("/events"),
    enabled: !!me && me.role === "MANAGER",
  });

  const activeEvents =
    events?.filter((e) => e.status === "ACTIVE") ?? [];

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
                    href="/admin/events"
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    事件管理
                  </Link>
                  <Link
                    href="/admin/events/new"
                    className={cn(buttonVariants({ variant: "outline" }))}
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

        {me?.role === "MANAGER" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                我的團隊事件
              </h2>
              <p className="text-sm text-muted-foreground">
                目前進行中事件的團隊回報狀況
              </p>
            </div>
            {activeEvents.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  目前沒有進行中事件
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeEvents.map((event) => (
                  <EventStatCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
