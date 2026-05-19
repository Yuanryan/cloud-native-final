"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { Breadcrumb } from "@/components/breadcrumb";
import { apiFetch, getSession } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AuditItem = {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  createdAt: string;
  actor: { email: string; name: string } | null;
};

type AuditResponse = { items: AuditItem[]; total: number; page: number };

export default function AdminAuditPage() {
  const router = useRouter();
  const t = useTranslations("audit");
  const tc = useTranslations("common");

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const s = getSession();
    if (!s) router.replace("/login");
    else if (s.user.role !== "ADMIN") router.replace("/dashboard");
  }, [router]);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => apiFetch<AuditResponse>("/audit-logs?limit=50"),
    enabled: mounted && getSession()?.user.role === "ADMIN",
  });

  return (
    <AppShell>
      <Breadcrumb
        items={[
          { label: "管理" },
          { label: t("title") },
        ]}
      />
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">{tc("loading")}</p>}
          {data && (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                {t("summary", { total: data.total, count: data.items.length })}
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("timeColumn")}</TableHead>
                    <TableHead>{t("actorColumn")}</TableHead>
                    <TableHead>{t("actionColumn")}</TableHead>
                    <TableHead>{t("resourceColumn")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(row.createdAt).toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" })}
                      </TableCell>
                      <TableCell>{row.actor?.email ?? "—"}</TableCell>
                      <TableCell>
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                          style={
                            row.action.startsWith("CREATE")
                              ? { backgroundColor: "var(--info-bg)", color: "var(--info)", border: "1px solid var(--info)" }
                              : row.action.startsWith("UPDATE")
                              ? { backgroundColor: "var(--warning-bg)", color: "var(--warning)", border: "1px solid var(--warning)" }
                              : row.action.startsWith("DELETE")
                              ? { backgroundColor: "oklch(0.977 0.013 17.38)", color: "var(--destructive)", border: "1px solid var(--destructive)" }
                              : { backgroundColor: "var(--muted)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }
                          }
                        >
                          {row.action}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.resource}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
