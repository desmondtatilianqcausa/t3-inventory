"use client";

import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronDownIcon,
  ColumnsIcon,
  MoreHorizontal,
  PlusIcon,
} from "lucide-react";

// augment ColumnMeta to include headerClassName
declare module "@tanstack/table-core" {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface ColumnMeta<TData, TValue> {
    headerClassName?: string;
  }
}

export function DataTable<TData>({
  title,
  data,
  columns,
  postType,
  onAddNew,
  showTextFilter = true,
  showAddButton = true,
  showCustomizeColumns = true,
  showNavigateButtons = true,
  showTableFooter = true,
  titleSize = "2xl",
  filterColumns = [],
  isLoading = false,
  skeletonRows = 5,
  filterComponent,
  initialColumnVisibility,
  getRowId,
}: {
  title?: string;
  titleSize?: "lg" | "xl" | "2xl" | "3xl";
  data: TData[] | undefined;
  columns: ColumnDef<TData, unknown>[];
  postType: string;
  onAddNew?: () => void;
  showTextFilter?: boolean;
  showAddButton?: boolean;
  showCustomizeColumns?: boolean;
  showNavigateButtons?: boolean;
  showTableFooter?: boolean;
  filterColumns?: string[];
  isLoading?: boolean;
  skeletonRows?: number;
  filterComponent?: React.ReactNode;
  initialColumnVisibility?: VisibilityState;
  getRowId?: (row: TData, index: number) => string;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialColumnVisibility ?? {});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data: data ?? [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getRowId: getRowId
      ? (row, index) => getRowId(row as TData, index)
      : undefined,
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const firstFilterableColumnId = React.useMemo(() => {
    for (const id of filterColumns) {
      const col = table.getColumn(id);
      if (col) return id;
    }
    return undefined;
  }, [filterColumns, table]);

  const filterValue: string =
    (firstFilterableColumnId
      ? (table.getColumn(firstFilterableColumnId)?.getFilterValue() as string)
      : "") ?? "";

  const showSkeletons = isLoading || !data;

  return (
    <div className="w-full">
      <h2 className={`text-${titleSize} font-bold`}>{title}</h2>
      <div className="flex flex-col gap-2 py-4">
        <div className="flex items-stretch justify-between">
          {showTextFilter && firstFilterableColumnId && (
            <Input
              placeholder={`Filter ${postType}s...`}
              value={filterValue}
              onChange={(event) =>
                table
                  .getColumn(firstFilterableColumnId)
                  ?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
          )}
          <div className="flex flex-1 items-center justify-end gap-2">
            {showCustomizeColumns && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <ColumnsIcon />
                    <span className="hidden lg:inline">Customize Columns</span>
                    <span className="lg:hidden">Columns</span>
                    <ChevronDownIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {table
                    .getAllColumns()
                    .filter(
                      (column) =>
                        typeof column.accessorFn !== "undefined" &&
                        column.getCanHide(),
                    )
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) =>
                            column.toggleVisibility(!!value)
                          }
                        >
                          {column.id}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {showAddButton && (
              <Button size="sm" onClick={onAddNew}>
                <PlusIcon />
                <span className="hidden lg:inline">Add {postType}</span>
              </Button>
            )}
          </div>
        </div>
        {filterComponent ? (
          <div className="flex flex-wrap items-center gap-2">
            {filterComponent}
          </div>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className={header.column.columnDef.meta?.headerClassName}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {showSkeletons ? (
              Array.from({ length: skeletonRows }).map((_, rIdx) => (
                <TableRow key={`sk-${rIdx}`}>
                  {table.getVisibleLeafColumns().map((col) => (
                    <TableCell key={`sk-${rIdx}-${col.id}`}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {showTableFooter && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          {showNavigateButtons && (
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
