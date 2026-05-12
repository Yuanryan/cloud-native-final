"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { apiFetch, getSession } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ReportPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const router = useRouter();
  const qc = useQueryClient();
  const [status, setStatus] = useState<"SAFE" | "NEED_HELP">("SAFE");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!getSession()) router.replace("/login");
  }, [router]);

  const { data: event } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () =>
      apiFetch<{ id: string; title: string; status: string }>(`/events/${eventId}`),
    enabled: !!eventId && !!getSession(),
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch(`/events/${eventId}/reports`, {
        method: "POST",
        body: JSON.stringify({ status, message: message || undefined }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event", eventId] });
      qc.invalidateQueries({ queryKey: ["event", eventId, "stats"] });
      qc.invalidateQueries({ queryKey: ["event", eventId, "report", "me"] });
      router.push(`/events/${eventId}`);
    },
  });

  if (event && event.status !== "ACTIVE") {
    return (
      <AppShell>
        <p className="text-muted-foreground">此事件未開放回報。</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>安全回報</CardTitle>
          <CardDescription>{event?.title}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>狀態</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={status === "SAFE" ? "default" : "outline"}
                onClick={() => setStatus("SAFE")}
              >
                安全
              </Button>
              <Button
                type="button"
                variant={status === "NEED_HELP" ? "destructive" : "outline"}
                onClick={() => setStatus("NEED_HELP")}
              >
                需要協助
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="msg">補充說明（選填）</Label>
            <Input
              id="msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="位置、需求、聯絡方式等"
            />
          </div>
          {mutation.isError && (
            <p className="text-sm text-destructive">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "送出失敗"}
            </p>
          )}
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "送出中…" : "送出回報"}
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
