import { type Doc } from "@/convex/_generated/dataModel";
import { type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Checkbox } from "~/app/_components/ui/checkbox";

type Workflow = Doc<"workflows">;

export const columns: ColumnDef<Workflow>[] = [
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
    header: "Workflow",
    cell: ({ row }) => {
      const wf = row.original;
      return (
        <Link
          href={`/admin/settings/workflows/${String(wf._id)}`}
          className="font-medium underline"
        >
          {wf.name}
        </Link>
      );
    },
    meta: { headerClassName: "w-full" },
  },
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
  },
];
