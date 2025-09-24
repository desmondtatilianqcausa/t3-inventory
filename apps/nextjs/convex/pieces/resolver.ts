import type { ResolveTemplates, TemplateScope } from "./types";

function getPath(scope: TemplateScope, path: string): unknown {
  const parts = path.split(".");
  let cur: any = scope; // eslint-disable-line @typescript-eslint/no-explicit-any
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p as keyof typeof cur];
  }
  return cur;
}

function resolveString(input: string, scope: TemplateScope): string {
  return input.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_m, p1) => {
    const v = getPath(scope, String(p1).trim());
    if (v === undefined || v === null) return "";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  });
}

export const resolveTemplates: ResolveTemplates = (value, scope) => {
  if (typeof value === "string") return resolveString(value, scope) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (Array.isArray(value))
    return value.map((v) => resolveTemplates(v, scope)) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = resolveTemplates(v, scope);
    }
    return out as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
  return value as any; // eslint-disable-line @typescript-eslint/no-explicit-any
};
