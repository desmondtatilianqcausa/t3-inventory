"use client";

import { Button } from "./components/blocks/button";
import type { ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";
import type { PDFColumn } from "./pdf-export";
import React from "react";
import { toast } from "./toast";
import { usePDFExport } from "./pdf-export";

interface EntityListWithPDFExportProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  entityListComponent: React.ComponentType<{
    data: T[];
    columns: ColumnDef<T>[];
    [key: string]: unknown;
  }>;
  pdfTitle: string;
  pdfSubtitle?: string;
  pdfFilename?: string;
  customMetadata?: Record<string, string>;
  onExportSuccess?: (recordCount: number) => void;
  onExportError?: (error: unknown) => void;
  // PDF-specific options
  pdfPageOrientation?: "portrait" | "landscape";
  enablePageBreaks?: boolean;
  headerOnEveryPage?: boolean;
  // Additional props to pass through to EntityList
  [key: string]: unknown;
}

/**
 * Helper function to convert table columns to PDF columns with better width management
 * This provides a basic conversion, but you may want to customize this for specific use cases
 */
export function convertTableColumnsToPDFColumns<T>(
  columns: ColumnDef<T>[],
  pageOrientation: "portrait" | "landscape" = "portrait",
): PDFColumn[] {
  const filteredColumns = columns.filter(
    (col) => "accessorKey" in col || "accessorFn" in col,
  );

  // Calculate optimal column widths based on content type and page orientation
  const totalColumns = filteredColumns.length;
  const availableWidth = pageOrientation === "landscape" ? 800 : 500; // Approximate page width minus margins
  const baseWidth = availableWidth / totalColumns;

  return filteredColumns.map((col, index) => {
    // Try to determine content type for better width allocation
    const header =
      typeof col.header === "string" ? col.header : (col.id ?? "Column");
    const accessorKey =
      "accessorKey" in col ? (col.accessorKey as string) : undefined;

    // Estimate width based on header length and column type
    let estimatedWidth = baseWidth;

    // Adjust width based on common patterns
    if (accessorKey) {
      // IDs and codes get smaller width
      if (
        accessorKey.toLowerCase().includes("id") ||
        accessorKey.toLowerCase().includes("code")
      ) {
        estimatedWidth = Math.min(baseWidth * 0.6, 80);
      }
      // Dates get medium width
      else if (
        accessorKey.toLowerCase().includes("date") ||
        accessorKey.toLowerCase().includes("time")
      ) {
        estimatedWidth = Math.min(baseWidth * 0.8, 120);
      }
      // Status fields get smaller width
      else if (
        accessorKey.toLowerCase().includes("status") ||
        accessorKey.toLowerCase().includes("type")
      ) {
        estimatedWidth = Math.min(baseWidth * 0.7, 100);
      }
      // Names and descriptions get larger width
      else if (
        accessorKey.toLowerCase().includes("name") ||
        accessorKey.toLowerCase().includes("description") ||
        accessorKey.toLowerCase().includes("title")
      ) {
        estimatedWidth = baseWidth * 1.3;
      }
    }

    return {
      key: accessorKey ?? col.id ?? `column_${index}`,
      header,
      width: Math.max(60, Math.min(estimatedWidth, availableWidth * 0.4)), // Min 60px, max 40% of page
      getValue: (row: T) => {
        if ("accessorKey" in col && col.accessorKey) {
          const value = (row as Record<string, unknown>)[
            col.accessorKey as string
          ];
          if (value == null) return "";

          // Handle different data types
          if (typeof value === "boolean") {
            return value ? "Yes" : "No";
          }
          if (typeof value === "number") {
            // Format numbers with appropriate precision
            return value % 1 === 0 ? value.toString() : value.toFixed(2);
          }
          if (typeof value === "object" && value !== null) {
            // Safe object stringification
            try {
              return JSON.stringify(value);
            } catch {
              return "[Complex Object]";
            }
          }

          return String(value);
        }
        if ("accessorFn" in col && col.accessorFn) {
          const value = col.accessorFn(row, 0);
          return value?.toString() ?? "";
        }
        return "";
      },
    };
  });
}

/**
 * A wrapper component that adds PDF export functionality to any EntityList
 *
 * Usage Example:
 * ```tsx
 * const users = [{ id: 1, name: "John", email: "john@example.com" }];
 * const columns = [
 *   { accessorKey: "name", header: "Name" },
 *   { accessorKey: "email", header: "Email" }
 * ];
 *
 * <EntityListWithPDFExport
 *   data={users}
 *   columns={columns}
 *   entityListComponent={EntityList}
 *   pdfTitle="User List"
 *   pdfSubtitle="All active users"
 *   pdfFilename="users_export.pdf"
 *   pdfPageOrientation="landscape"
 *   enablePageBreaks={true}
 *   headerOnEveryPage={true}
 *   title="Users"
 *   description="Manage your users"
 * />
 * ```
 */
export function EntityListWithPDFExport<T>({
  data,
  columns,
  entityListComponent: EntityListComponent,
  pdfTitle,
  pdfSubtitle,
  pdfFilename,
  customMetadata,
  onExportSuccess,
  onExportError,
  pdfPageOrientation = "landscape", // Default to landscape for better table viewing
  enablePageBreaks = true,
  headerOnEveryPage = true,
  ...entityListProps
}: EntityListWithPDFExportProps<T>) {
  const { exportToPDF, isGenerating } = usePDFExport();

  const handleExportToPDF = async () => {
    if (!data.length) {
      toast.error("No data to export");
      return;
    }

    try {
      const pdfColumns = convertTableColumnsToPDFColumns(
        columns,
        pdfPageOrientation,
      );
      const filename =
        pdfFilename ?? `export_${new Date().toISOString().split("T")[0]}.pdf`;

      await exportToPDF({
        title: pdfTitle,
        subtitle: pdfSubtitle,
        filename,
        data,
        columns: pdfColumns,
        pageOrientation: pdfPageOrientation,
        enablePageBreaks,
        headerOnEveryPage,
        includeMetadata: true,
        customMetadata: {
          "Total Records": data.length.toString(),
          "Generated At": new Date().toLocaleString(),
          "Page Layout": pdfPageOrientation,
          ...customMetadata,
        },
      });

      toast.success(`PDF exported successfully! (${data.length} records)`);
      onExportSuccess?.(data.length);
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF. Please try again.");
      onExportError?.(error);
    }
  };

  // Add export button to entity actions
  const exportButton = (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExportToPDF}
      disabled={isGenerating || !data.length}
      title={`Export ${data.length ?? 0} records to PDF`}
    >
      <Download className="mr-2 h-4 w-4" />
      {isGenerating ? "Generating..." : "Export PDF"}
    </Button>
  );

  return (
    <div className="space-y-4">
      {/* Export Button */}
      <div className="flex justify-end">{exportButton}</div>

      {/* EntityList Component */}
      <EntityListComponent data={data} columns={columns} {...entityListProps} />
    </div>
  );
}

/**
 * Hook for adding PDF export functionality to existing components
 *
 * Usage Example:
 * ```tsx
 * function MyComponent() {
 *   const { exportToPDF, isGenerating, exportButton } = useEntityListPDFExport({
 *     data: myData,
 *     columns: myColumns,
 *     pdfTitle: "My Data Export",
 *     pdfPageOrientation: "landscape"
 *   });
 *
 *   return (
 *     <div>
 *       {exportButton}
 *       <MyEntityList data={myData} columns={myColumns} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useEntityListPDFExport<T>({
  data,
  columns,
  pdfTitle,
  pdfSubtitle,
  pdfFilename,
  customMetadata,
  onExportSuccess,
  onExportError,
  pdfPageOrientation = "landscape",
  enablePageBreaks = true,
  headerOnEveryPage = true,
}: {
  data: T[];
  columns: ColumnDef<T>[];
  pdfTitle: string;
  pdfSubtitle?: string;
  pdfFilename?: string;
  customMetadata?: Record<string, string>;
  onExportSuccess?: (recordCount: number) => void;
  onExportError?: (error: unknown) => void;
  pdfPageOrientation?: "portrait" | "landscape";
  enablePageBreaks?: boolean;
  headerOnEveryPage?: boolean;
}) {
  const { exportToPDF, isGenerating } = usePDFExport();

  const handleExportToPDF = async () => {
    if (!data.length) {
      toast.error("No data to export");
      return;
    }

    try {
      const pdfColumns = convertTableColumnsToPDFColumns(
        columns,
        pdfPageOrientation,
      );
      const filename =
        pdfFilename ?? `export_${new Date().toISOString().split("T")[0]}.pdf`;

      await exportToPDF({
        title: pdfTitle,
        subtitle: pdfSubtitle,
        filename,
        data,
        columns: pdfColumns,
        pageOrientation: pdfPageOrientation,
        enablePageBreaks,
        headerOnEveryPage,
        includeMetadata: true,
        customMetadata: {
          "Total Records": data.length.toString(),
          "Generated At": new Date().toLocaleString(),
          "Page Layout": pdfPageOrientation,
          ...customMetadata,
        },
      });

      toast.success(`PDF exported successfully! (${data.length} records)`);
      onExportSuccess?.(data.length);
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF. Please try again.");
      onExportError?.(error);
    }
  };

  const exportButton = (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExportToPDF}
      disabled={isGenerating || !data.length}
      title={`Export ${data.length ?? 0} records to PDF`}
    >
      <Download className="mr-2 h-4 w-4" />
      {isGenerating ? "Generating..." : "Export PDF"}
    </Button>
  );

  return {
    exportToPDF: handleExportToPDF,
    isGenerating,
    exportButton,
  };
}
