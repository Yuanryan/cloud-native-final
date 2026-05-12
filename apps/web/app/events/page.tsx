"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { apiFetch, getSession } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type EventRow = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
};

export default function EventsPage() {
  const router = useRouter();
  useEffect(() => {
    if (!getSession()) router.replace("/login");
  }, [router]);

  const { data: events, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => apiFetch<EventRow[]>("/events"),
    enabled: typeof window !== "undefined" && !!getSession(),
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">事件列表</h1>
          <p className="text-muted-foreground">依角色顯示可見範圍內的緊急事件。</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>事件</CardTitle>
            <CardDescription>點選列以查看詳情、統計與回報。</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="text-sm text-muted-foreground">載入中…</p>}
            {events && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>標題</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead>建立時間</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <Link
                          href={`/events/${e.id}`}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {e.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{e.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(e.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
