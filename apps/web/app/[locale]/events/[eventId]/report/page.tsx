"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { Breadcrumb } from "@/components/breadcrumb";
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
  const t = useTranslations("report");
  const te = useTranslations("events");
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
        <p className="text-muted-foreground">{t("notActive")}</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Breadcrumb
        items={[
          { label: te("title"), href: "/events" },
          { label: event?.title ?? "", href: eventId ? `/events/${eventId}` : undefined },
          { label: t("title") },
        ]}
      />
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{event?.title}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("statusLabel")}</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus("SAFE")}
                className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 transition-colors"
                style={
                  status === "SAFE"
                    ? {
                        borderColor: "var(--success)",
                        backgroundColor: "var(--success-bg)",
                      }
                    : { borderColor: "var(--border)", backgroundColor: "transparent" }
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={status === "SAFE" ? "var(--success)" : "currentColor"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span
                  className="text-sm font-semibold"
                  style={{ color: status === "SAFE" ? "var(--success)" : "inherit" }}
                >
                  {t("safe")}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatus("NEED_HELP")}
                className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 transition-colors"
                style={
                  status === "NEED_HELP"
                    ? {
                        borderColor: "var(--destructive)",
                        backgroundColor: "oklch(0.977 0.013 17.38)",
                      }
                    : { borderColor: "var(--border)", backgroundColor: "transparent" }
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={status === "NEED_HELP" ? "var(--destructive)" : "currentColor"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span
                  className="text-sm font-semibold"
                  style={{ color: status === "NEED_HELP" ? "var(--destructive)" : "inherit" }}
                >
                  {t("needHelp")}
                </span>
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="msg">{t("messageLabel")}</Label>
            <Input
              id="msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("messagePlaceholder")}
            />
          </div>
          {mutation.isError && (
            <p className="text-sm text-destructive">
              {mutation.error instanceof Error
                ? mutation.error.message
                : t("submitFailed")}
            </p>
          )}
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? t("submitting") : t("submit")}
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
