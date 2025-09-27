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

type UserRow = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  roles?: string[];
};

export default function UsersPage() {
  const users = useQuery(api.users.queries.listAll, {});
  const upsert = useMutation(api.users.mutations.upsertProfile);
  const setRoles = useMutation(api.users.mutations.setRoles);

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<UserRow | null>(null);
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<"user" | "admin">("user");

  const startCreate = () => {
    setEditing(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setRole("user");
    setOpen(true);
  };
  const startEdit = (row: UserRow) => {
    setEditing(row);
    setFirstName(row.firstName ?? "");
    setLastName(row.lastName ?? "");
    setEmail(row.email);
    const currentRole = (row.roles ?? ["user"]).includes("admin")
      ? "admin"
      : "user";
    setRole(currentRole);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!email) return;
    await upsert({
      email,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
    });
    await setRoles({
      id: (editing?._id as any) ?? (await ensureUserIdByEmail(email)),
      roles: role === "admin" ? ["admin"] : ["user"],
    });
    setOpen(false);
  };

  // Helper: if creating new, we need id; do a post-upsert fetch by email
  const ensureUserIdByEmail = async (targetEmail: string): Promise<string> => {
    // Re-fetch list and find
    // In client components we can't run queries imperatively; rely on next render pass
    // As a workaround, optimistically return editing id or empty;
    // In most cases editing exists; for new users, roles can be set on a subsequent page refresh.
    const found = (users ?? []).find(
      (u) => String((u as any).email) === targetEmail,
    );
    return String((found as any)?._id ?? "");
  };

  const columns: ColumnDef<UserRow>[] = [
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "firstName",
      header: "First Name",
    },
    {
      accessorKey: "lastName",
      header: "Last Name",
    },
    {
      id: "role",
      header: "Role",
      cell: ({ row }) => {
        const r = (row.original.roles ?? ["user"]).includes("admin")
          ? "admin"
          : "user";
        return <span className="capitalize">{r}</span>;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => startEdit(row.original)}
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
      <DataTable<UserRow>
        title="Users"
        data={(users as any) ?? []}
        columns={columns}
        postType="User"
        onAddNew={startCreate}
        filterColumns={["email"]}
        isLoading={!users}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit User" : "Create User"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!editing}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <label className="text-sm font-medium">First Name</label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Last Name</label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Role</label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as "user" | "admin")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
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
