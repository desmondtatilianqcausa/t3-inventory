import { type Doc } from "@/convex/_generated/dataModel";
import { type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Checkbox } from "~/app/_components/ui/checkbox";

type Connection = Doc<"integrationConnections">;

export const columns: ColumnDef<Connection>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    meta: { headerClassName: "min-w-20" },
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const p = row.original;
      return (
        <Link
          href={`/admin/settings/integrations/${p.integrationId}/connections/${p._id}`}
        >
          {p.name}
        </Link>
      );
    },
    meta: { headerClassName: "w-full" },
  },
  {
    id: "boardId",
    header: "Board ID",
    cell: ({ row }) => {
      const cfg = (row.original.config ?? {}) as { boardId?: number };
      return cfg?.boardId ?? "-";
    },
  },
  {
    id: "isDefault",
    header: "Default",
    cell: ({ row }) => {
      const cfg = (row.original.config ?? {}) as { isDefault?: boolean };
      return cfg?.isDefault ? "Yes" : "No";
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
  },
];
