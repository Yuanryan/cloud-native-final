"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { apiFetch, getSession } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  type: string;
  readAt: string | null;
  createdAt: string;
};

export default function NotificationsPage() {
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    if (!getSession()) router.replace("/login");
  }, [router]);

  const { data: items, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<NotificationRow[]>("/notifications"),
    enabled: !!getSession(),
  });

  const markRead = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>通知</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">載入中…</p>}
          {items?.map((n) => (
            <div
              key={n.id}
              className="flex flex-col gap-2 border-b pb-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{n.title}</p>
                  {!n.readAt && <Badge>未讀</Badge>}
                  <Badge variant="outline">{n.type}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{n.body}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              {!n.readAt && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markRead.mutate(n.id)}
                  disabled={markRead.isPending}
                >
                  標為已讀
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
