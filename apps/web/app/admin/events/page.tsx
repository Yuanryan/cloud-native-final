"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type EventRow = {
  id: string;
  title: string;
  description?: string;
  status: "DRAFT" | "ACTIVE" | "CLOSED";
  createdAt: string;
};

const STATUS_OPTIONS = ["DRAFT", "ACTIVE", "CLOSED"] as const;

function statusVariant(
  status: string
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "ACTIVE") return "default";
  if (status === "DRAFT") return "secondary";
  return "outline";
}

export default function AdminEventsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState<string>("DRAFT");
  const [editAttempted, setEditAttempted] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s) router.replace("/login");
    else if (s.user.role !== "ADMIN") router.replace("/dashboard");
  }, [router]);

  const enabled = getSession()?.user.role === "ADMIN";

  const { data: events, isLoading } = useQuery({
    queryKey: ["events", "admin"],
    queryFn: () => apiFetch<EventRow[]>("/events"),
    enabled,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      title,
      description,
      status,
    }: {
      id: string;
      title: string;
      description: string;
      status: string;
    }) =>
      apiFetch(`/events/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title, description, status }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      setEditingId(null);
    },
  });

  const editErrors = {
    title:
      editTitle.trim().length === 0
        ? "請輸入標題"
        : editTitle.trim().length < 2
        ? "標題至少 2 字元"
        : null,
  };
  const editIsValid = Object.values(editErrors).every((e) => e === null);

  function openEdit(e: EventRow) {
    setEditingId(e.id);
    setEditTitle(e.title);
    setEditDesc(e.description ?? "");
    setEditStatus(e.status);
    setEditAttempted(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditAttempted(false);
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">事件管理</h1>
          <Link
            href="/admin/events/new"
            className={cn(buttonVariants())}
          >
            建立事件
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>所有事件</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <p className="text-sm text-muted-foreground">載入中…</p>
            )}
            {events && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>標題</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead>建立時間</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((e) => (
                    <>
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.title}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(e.status)}>
                            {e.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(e.createdAt).toLocaleDateString("zh-TW")}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="flex items-center justify-end gap-2">
                            <Link
                              href={`/events/${e.id}`}
                              className={cn(
                                buttonVariants({ variant: "outline", size: "sm" })
                              )}
                            >
                              查看
                            </Link>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                editingId === e.id ? cancelEdit() : openEdit(e)
                              }
                            >
                              {editingId === e.id ? "收起" : "編輯"}
                            </Button>
                          </span>
                        </TableCell>
                      </TableRow>
                      {editingId === e.id && (
                        <TableRow key={`${e.id}-edit`}>
                          <TableCell colSpan={4}>
                            <div className="rounded-lg border bg-muted/30 p-4">
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-1">
                                  <Label>標題</Label>
                                  <Input
                                    value={editTitle}
                                    onChange={(ev) =>
                                      setEditTitle(ev.target.value)
                                    }
                                  />
                                  {editAttempted && editErrors.title && (
                                    <p className="text-xs text-destructive">{editErrors.title}</p>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <Label>狀態</Label>
                                  <select
                                    value={editStatus}
                                    onChange={(e) => setEditStatus(e.target.value)}
                                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {STATUS_OPTIONS.map((s) => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="space-y-1 sm:col-span-2">
                                  <Label>說明（選填）</Label>
                                  <Input
                                    value={editDesc}
                                    onChange={(ev) =>
                                      setEditDesc(ev.target.value)
                                    }
                                  />
                                </div>
                              </div>
                              {updateMutation.isError && (
                                <p className="mt-2 text-sm text-destructive">
                                  {updateMutation.error instanceof Error
                                    ? updateMutation.error.message
                                    : "更新失敗"}
                                </p>
                              )}
                              <div className="mt-4 flex gap-2">
                                <Button
                                  disabled={updateMutation.isPending}
                                  onClick={() => {
                                    setEditAttempted(true);
                                    if (editIsValid)
                                      updateMutation.mutate({
                                        id: e.id,
                                        title: editTitle,
                                        description: editDesc,
                                        status: editStatus,
                                      });
                                  }}
                                >
                                  {updateMutation.isPending
                                    ? "儲存中…"
                                    : "儲存"}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={cancelEdit}
                                >
                                  取消
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
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
