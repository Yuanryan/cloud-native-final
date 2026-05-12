"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { apiFetch, getSession } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type EventDetail = {
  id: string;
  title: string;
  description: string | null;
  status: string;
};

type Stats = {
  total: number;
  responded: number;
  safe: number;
  need_help: number;
  no_response: number;
  scope: string;
};

type ReportRow = {
  id: string;
  status: string;
  message: string | null;
  user: { id: string; name: string; email: string; department: { name: string } };
};

type Me = { role: string };

export default function EventDetailPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const router = useRouter();
  const session = typeof window !== "undefined" ? getSession() : null;

  useEffect(() => {
    if (!getSession()) router.replace("/login");
  }, [router]);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<Me>("/auth/me"),
    enabled: !!session,
  });

  const { data: event } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => apiFetch<EventDetail>(`/events/${eventId}`),
    enabled: !!eventId && !!session,
  });

  const { data: stats } = useQuery({
    queryKey: ["event", eventId, "stats"],
    queryFn: () => apiFetch<Stats>(`/events/${eventId}/stats`),
    enabled: !!eventId && !!session,
  });

  const { data: myReport } = useQuery({
    queryKey: ["event", eventId, "report", "me"],
    queryFn: () => apiFetch<ReportRow | null>(`/events/${eventId}/reports/me`),
    enabled:
      !!eventId &&
      !!session &&
      (me?.role === "EMPLOYEE" || me?.role === "MANAGER"),
  });

  const { data: teamReports } = useQuery({
    queryKey: ["event", eventId, "reports", "team"],
    queryFn: () => apiFetch<ReportRow[]>(`/events/${eventId}/reports/team`),
    enabled: !!eventId && !!session && me?.role === "MANAGER",
  });

  const { data: allReports } = useQuery({
    queryKey: ["event", eventId, "reports", "all"],
    queryFn: () => apiFetch<ReportRow[]>(`/events/${eventId}/reports`),
    enabled: !!eventId && !!session && me?.role === "ADMIN",
  });

  const qc = useQueryClient();

  const reminder = useMutation({
    mutationFn: () =>
      apiFetch(`/events/${eventId}/reminders/run`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const reports =
    me?.role === "ADMIN" ? allReports : me?.role === "MANAGER" ? teamReports : undefined;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{event?.title ?? "事件"}</h1>
            {event?.description && (
              <p className="mt-2 text-muted-foreground">{event.description}</p>
            )}
            {event && (
              <Badge className="mt-2" variant="outline">
                {event.status}
              </Badge>
            )}
          </div>
          {(me?.role === "EMPLOYEE" || me?.role === "MANAGER") &&
            event?.status === "ACTIVE" && (
              <Link
                href={`/events/${eventId}/report`}
                className={cn(buttonVariants())}
              >
                安全回報
              </Link>
            )}
        </div>

        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="應回報人數" value={stats.total} hint={stats.scope} />
            <StatCard label="已回報" value={stats.responded} />
            <StatCard label="安全" value={stats.safe} />
            <StatCard label="需要協助" value={stats.need_help} />
            <StatCard label="未回報" value={stats.no_response} />
          </div>
        )}

        {me?.role === "ADMIN" && event?.status === "ACTIVE" && (
          <Card>
            <CardHeader>
              <CardTitle>未回報提醒</CardTitle>
              <CardDescription>
                為尚未回報的員工建立通知，並提醒相關主管關懷轄下。
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                disabled={reminder.isPending}
                onClick={() => reminder.mutate()}
              >
                {reminder.isPending ? "執行中…" : "執行提醒流程"}
              </Button>
              {reminder.isError && (
                <span className="text-sm text-destructive">
                  {reminder.error instanceof Error
                    ? reminder.error.message
                    : "失敗"}
                </span>
              )}
              {reminder.isSuccess && (
                <span className="text-sm text-muted-foreground">已送出。</span>
              )}
            </CardContent>
          </Card>
        )}

        {(me?.role === "EMPLOYEE" || me?.role === "MANAGER") && (
          <Card>
            <CardHeader>
              <CardTitle>我的回報</CardTitle>
              <CardDescription>此事件下您的最新回報狀態。</CardDescription>
            </CardHeader>
            <CardContent>
              {myReport ? (
                <div className="space-y-1 text-sm">
                  <p>
                    狀態：<Badge>{myReport.status}</Badge>
                  </p>
                  {myReport.message && <p>說明：{myReport.message}</p>}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">尚未回報。</p>
              )}
            </CardContent>
          </Card>
        )}

        {reports && (
          <Card>
            <CardHeader>
              <CardTitle>
                {me?.role === "ADMIN" ? "全公司回報" : "轄下 / 部門回報"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>部門</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead>說明</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.user.name}</TableCell>
                      <TableCell>{r.user.department.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{r.status}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {r.message ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
        {hint && <p className="text-xs text-muted-foreground">scope: {hint}</p>}
      </CardHeader>
    </Card>
  );
}
