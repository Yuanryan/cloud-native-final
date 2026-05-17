"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  departmentId: string;
  managerId: string | null;
  department: { id: string; name: string };
};

type Department = {
  id: string;
  name: string;
};

type FormMode = "none" | "create" | "edit";

const ROLES = ["EMPLOYEE", "MANAGER", "ADMIN"] as const;

function UserForm({
  mode,
  initial,
  departments,
  managers,
  onSuccess,
  onCancel,
}: {
  mode: "create" | "edit";
  initial?: UserRow;
  departments: Department[];
  managers: UserRow[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>(initial?.role ?? "");
  const [attempted, setAttempted] = useState(false);
  const [departmentId, setDepartmentId] = useState(
    initial?.departmentId ?? ""
  );
  const [managerId, setManagerId] = useState<string>(
    initial?.managerId ?? ""
  );

  const mutation = useMutation({
    mutationFn: () => {
      if (mode === "create") {
        return apiFetch("/users", {
          method: "POST",
          body: JSON.stringify({
            name,
            email,
            password,
            role,
            departmentId,
            managerId: managerId || null,
          }),
        });
      }
      const body: Record<string, unknown> = { name, role, departmentId, managerId: managerId || null };
      if (password) body.password = password;
      return apiFetch(`/users/${initial!.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      onSuccess();
    },
  });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const errors = {
    name: name.trim().length === 0 ? "請輸入姓名" : null,
    email:
      mode === "create"
        ? email.trim().length === 0
          ? "請輸入 Email"
          : !emailRegex.test(email)
          ? "Email 格式不正確"
          : null
        : null,
    password:
      mode === "create" && password.length > 0 && password.length < 6
        ? "密碼至少 6 字元"
        : mode === "create" && password.length === 0
        ? "請輸入密碼"
        : null,
    role: role === "" ? "請選擇角色" : null,
    departmentId: departmentId === "" ? "請選擇部門" : null,
  };
  const isValid = Object.values(errors).every((e) => e === null);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{mode === "create" ? "新增使用者" : "編輯使用者"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>姓名</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            {attempted && errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>
          {mode === "create" && (
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {attempted && errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>
          )}
          <div className="space-y-1">
            <Label>{mode === "create" ? "密碼" : "新密碼（選填）"}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "edit" ? "留空不修改" : "至少 6 字元"}
            />
            {attempted && errors.password && (
              <p className="text-xs text-destructive">{errors.password}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>角色</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">請選擇角色</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {attempted && errors.role && (
              <p className="text-xs text-destructive">{errors.role}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>部門</Label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">請選擇部門</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {attempted && errors.departmentId && (
              <p className="text-xs text-destructive">{errors.departmentId}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>主管（選填）</Label>
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">（無）</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>
        {mutation.isError && (
          <p className="mt-2 text-sm text-destructive">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "操作失敗，請再試一次"}
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <Button
            disabled={mutation.isPending}
            onClick={() => {
              setAttempted(true);
              if (isValid) mutation.mutate();
            }}
          >
            {mutation.isPending ? "儲存中…" : "儲存"}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminUsersPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [mode, setMode] = useState<FormMode>("none");
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const s = getSession();
    if (!s) router.replace("/login");
    else if (s.user.role !== "ADMIN") router.replace("/dashboard");
  }, [router]);

  const enabled = getSession()?.user.role === "ADMIN";

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<UserRow[]>("/users"),
    enabled,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: () => apiFetch<Department[]>("/departments"),
    enabled,
  });

  const managers = users?.filter((u) => u.role === "MANAGER") ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setConfirmDeleteId(null);
    },
  });

  function openCreate() {
    setEditingUser(null);
    setMode("create");
  }

  function openEdit(u: UserRow) {
    setEditingUser(u);
    setMode("edit");
  }

  function closeForm() {
    setMode("none");
    setEditingUser(null);
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">使用者管理</h1>
          {mode === "none" && (
            <Button onClick={openCreate}>新增使用者</Button>
          )}
        </div>

        {(mode === "create" || mode === "edit") && (
          <UserForm
            mode={mode}
            initial={editingUser ?? undefined}
            departments={departments}
            managers={managers}
            onSuccess={closeForm}
            onCancel={closeForm}
          />
        )}

        <Card>
          <CardContent className="pt-4">
            {isLoading && (
              <p className="text-sm text-muted-foreground">載入中…</p>
            )}
            {users && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>部門</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{u.role}</Badge>
                      </TableCell>
                      <TableCell>{u.department.name}</TableCell>
                      <TableCell className="text-right">
                        {confirmDeleteId === u.id ? (
                          <span className="flex items-center justify-end gap-2">
                            <span className="text-sm text-destructive">
                              確認刪除？
                            </span>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={deleteMutation.isPending}
                              onClick={() => deleteMutation.mutate(u.id)}
                            >
                              確認
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              取消
                            </Button>
                          </span>
                        ) : (
                          <span className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEdit(u)}
                            >
                              編輯
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setConfirmDeleteId(u.id)}
                            >
                              刪除
                            </Button>
                          </span>
                        )}
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
