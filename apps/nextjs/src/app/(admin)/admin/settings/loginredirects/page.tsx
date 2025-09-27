"use client";

import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";

import { DataTable } from "~/app/_components/Table";
import { Button } from "~/app/_components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/app/_components/ui/dialog";
import { Input } from "~/app/_components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/app/_components/ui/select";

export default function LoginRedirectsPage() {
  const rows = useQuery(api.users.queries.listLoginRedirects, {});
  const upsert = useMutation(api.users.mutations.upsertLoginRedirect);

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<{
    _id?: string;
    role: string;
    path: string;
  } | null>(null);
  const [role, setRole] = React.useState("user");
  const [path, setPath] = React.useState("/admin");

  const onAdd = () => {
    setEditing(null);
    setRole("user");
    setPath("/admin");
    setOpen(true);
  };
  const onEdit = (row: any) => {
    setEditing(row);
    setRole(row.role);
    setPath(row.path);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!role || !path) return;
    await upsert({ role, path });
    setOpen(false);
  };

  const columns: ColumnDef<any>[] = [
    { accessorKey: "role", header: "Role" },
    { accessorKey: "path", header: "Path" },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(row.original)}
          >
            Edit
          </Button>
        </div>
      ),
      meta: { headerClassName: "min-w-28" },
    },
  ];

  return (
    <div className="p-4">
      <DataTable
        title="Login Redirects"
        data={(rows as any) ?? []}
        columns={columns}
        postType="LoginRedirect"
        onAddNew={onAdd}
        filterColumns={["role", "path"]}
        isLoading={!rows}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Redirect" : "Create Redirect"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={role} onValueChange={(v) => setRole(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Redirect Path</label>
              <Input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/admin"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
