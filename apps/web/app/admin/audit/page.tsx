"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
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
import { Badge } from "@/components/ui/badge";

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

  useEffect(() => {
    const s = getSession();
    if (!s) router.replace("/login");
    else if (s.user.role !== "ADMIN") router.replace("/dashboard");
  }, [router]);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => apiFetch<AuditResponse>("/audit-logs?limit=50"),
    enabled: getSession()?.user.role === "ADMIN",
  });

  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>稽核紀錄</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">載入中…</p>}
          {data && (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                共 {data.total} 筆（顯示最近 {data.items.length} 筆）
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>時間</TableHead>
                    <TableHead>操作者</TableHead>
                    <TableHead>動作</TableHead>
                    <TableHead>資源</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(row.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>{row.actor?.email ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.resource}
                        {row.resourceId ? ` / ${row.resourceId}` : ""}
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
