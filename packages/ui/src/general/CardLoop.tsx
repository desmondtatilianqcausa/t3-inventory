"use client";

import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import type { ReactNode } from "react";
import React, { useRef, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LayoutGrid, List, Search } from "lucide-react";

import { Button } from "../components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../components/dropdown-menu";
import { Input } from "../components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/tooltip";
import { cn } from "../lib/utils";
import { GeneralCard } from "./GeneralCard";

// Column definition for table view using TanStack Table
export type TableColumn<T> = ColumnDef<T>;

interface CardLoopProps<T extends object> {
  items: T[];
  // Either use renderItem OR cardComponent
  renderItem?: (item: T, index: number) => ReactNode;
  cardComponent?: React.ComponentType<{ item: T }>;
  // Layout & styling
  className?: string;
  containerClassName?: string;
  animate?: boolean;
  gridCols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  enableHoverEffects?: boolean;
  gap?: string;
  emptyState?: ReactNode;
  // View mode props
  initialViewMode?: "grid" | "table";
  showViewToggle?: boolean;
  tableColumns?: TableColumn<T>[];
  tableCellClassName?: string;
  tableContainerClassName?: string;
  pageSize?: number;
  // Table feature props
  enableRowSelection?: boolean;
  enableColumnVisibility?: boolean;
  enablePagination?: boolean;
  // Show filter input
  showFilter?: boolean;
  initialFilterValue?: string;
  // Custom filter function for grid view (when not using table)
  customFilterFn?: (item: T, filterValue: string) => boolean;
}

export function CardLoop<T extends object>({
  items,
  renderItem,
  cardComponent: CardComponent,
  className,
  containerClassName,
  animate = true,
  gridCols = {
    default: 1,
    sm: 2,
    md: 3,
    lg: 3,
    xl: 4,
  },
  gap = "gap-4",
  enableHoverEffects = true,
  emptyState,
  initialViewMode = "grid",
  showViewToggle = false,
  tableColumns = [],
  tableCellClassName,
  tableContainerClassName,
  pageSize = 10,
  enableRowSelection = false,
  enableColumnVisibility = false,
  enablePagination = false,
  showFilter = false,
  initialFilterValue = "",
  customFilterFn,
}: CardLoopProps<T>) {
  console.log("CardLoop enableHoverEffects", enableHoverEffects);
  const [viewMode, setViewMode] = useState<"grid" | "table">(initialViewMode);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState(initialFilterValue);

  // Create a ref for the filter input to maintain focus
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle search input changes without losing focus
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalFilter(e.target.value);
    // Keep focus on the input after changing filter value
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  // Define deep search for objects (used in filtering)
  const searchableObject = (
    obj: Record<string, any> | any[] | null | undefined,
  ): string => {
    if (!obj) return "";
    if (typeof obj !== "object") return String(obj).toLowerCase();

    // Extract values from the object
    return Object.values(obj)
      .map((val) => {
        if (typeof val === "object" && val !== null) {
          return searchableObject(val); // Recursively search nested objects
        }
        return String(val).toLowerCase();
      })
      .join(" ");
  };

  // Filter items for grid view based on global filter
  const filteredItems = React.useMemo(() => {
    if (!globalFilter) return items;

    const searchValue = globalFilter.toLowerCase();

    return items.filter((item) => {
      // First check if there's a custom filter function
      if (customFilterFn) {
        return customFilterFn(item, globalFilter);
      }

      // Default deep search implementation
      const itemAsString = searchableObject(item as Record<string, any>);
      return itemAsString.includes(searchValue);
    });
  }, [items, globalFilter, customFilterFn, searchableObject]);

  // Initialize TanStack Table with additional features
  const table = useReactTable({
    data: items,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    getPaginationRowModel: getPaginationRowModel(),
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
    enableRowSelection,
    // Improved global filter
    filterFns: {
      // Custom fuzzy search filter function
      fuzzy: (row, columnId, filterValue) => {
        const value = row.getValue(columnId);
        if (value == null) return false;
        // Handle objects and other complex types
        const valueStr =
          typeof value === "object" ? JSON.stringify(value) : String(value);
        return valueStr
          .toLowerCase()
          .includes(String(filterValue).toLowerCase());
      },
    },
    // Use the fuzzy filter function by directly referencing it
    globalFilterFn: "includesString",
  });

  // Create grid template columns based on gridCols
  const gridTemplate = {
    gridTemplateColumns: `repeat(${gridCols.default ?? 1}, minmax(0, 1fr))`,
    ["@media (min-width: 640px)"]: {
      gridTemplateColumns: `repeat(${gridCols.sm ?? 2}, minmax(0, 1fr))`,
    },
    ["@media (min-width: 768px)"]: {
      gridTemplateColumns: `repeat(${gridCols.md ?? 3}, minmax(0, 1fr))`,
    },
    ["@media (min-width: 1024px)"]: {
      gridTemplateColumns: `repeat(${gridCols.lg ?? 3}, minmax(0, 1fr))`,
    },
    ["@media (min-width: 1280px)"]: {
      gridTemplateColumns: `repeat(${gridCols.xl ?? 4}, minmax(0, 1fr))`,
    },
  };

  // Validate props
  if (!renderItem && !CardComponent) {
    console.error("CardLoop requires either renderItem or cardComponent prop");
    return null;
  }

  // Show empty state if no items
  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        {emptyState ?? "No items to display"}
      </div>
    );
  }

  // Render the card based on the provided props
  const renderCard = (item: T, index: number) => {
    if (CardComponent) {
      return <CardComponent item={item} />;
    }
    if (renderItem) {
      return <GeneralCard content={renderItem(item, index)} layout="stacked" />;
    }
    return null;
  };

  // Common header component that remains consistent across views
  const HeaderBar = () => (
    <div className="mb-4 flex flex-col items-start gap-4 md:flex-row md:items-center">
      {showViewToggle && (
        <div className="inline-flex rounded-md border bg-background shadow-sm">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  className="rounded-r-none border-r"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Grid View</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="icon"
                  className="rounded-l-none"
                  onClick={() => setViewMode("table")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Table View</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {showFilter && (
        <div className="relative flex w-full items-center gap-2 md:w-auto">
          <Search className="pointer-events-none absolute left-2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={globalFilter}
            onChange={handleSearchChange}
            placeholder="Search..."
            className="h-9 pl-8 md:w-[200px] lg:w-[250px]"
          />
        </div>
      )}

      {enableColumnVisibility && viewMode === "table" && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
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
    </div>
  );

  // Main container with consistent header
  return (
    <div className={className}>
      <HeaderBar />

      {viewMode === "table" ? (
        // Table view content
        <>
          <div className={cn("rounded-md border", tableContainerClassName)}>
            <GeneralCard
              enableHoverEffects={enableHoverEffects}
              content={
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              className={tableCellClassName}
                            >
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
                          colSpan={tableColumns.length}
                          className="h-24 text-center"
                        >
                          No results.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              }
            />
          </div>
          {enablePagination && (
            <div className="flex items-center justify-end space-x-2 py-4">
              {enableRowSelection && (
                <div className="flex-1 text-sm text-muted-foreground">
                  {table.getFilteredSelectedRowModel().rows.length} of{" "}
                  {table.getFilteredRowModel().rows.length} row(s) selected.
                </div>
              )}
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
            </div>
          )}
        </>
      ) : (
        // Grid view content
        <div
          className={cn("grid", gap, containerClassName)}
          style={gridTemplate as React.CSSProperties}
        >
          <AnimatePresence>
            {filteredItems.map((item, index) =>
              animate ? (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{
                    duration: 0.2,
                    delay: index * 0.05,
                  }}
                >
                  {renderCard(item, index)}
                </motion.div>
              ) : (
                renderCard(item, index)
              ),
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
