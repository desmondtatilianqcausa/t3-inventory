import React from "react";

interface JSONViewProps {
  data: unknown;
  className?: string;
}

/**
 * JSONView component for displaying JSON data in a formatted way
 */
export function JSONView({ data, className = "" }: JSONViewProps) {
  // Format the JSON with 2-space indentation
  const formattedJson = JSON.stringify(data, null, 2);

  return (
    <pre className={`overflow-auto rounded text-sm ${className}`}>
      <code>{formattedJson}</code>
    </pre>
  );
}
