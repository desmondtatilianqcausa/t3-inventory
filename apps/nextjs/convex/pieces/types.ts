export type TemplateScope = Record<string, unknown>;

export type ResolveTemplates = <T>(value: T, scope: TemplateScope) => T;

export type PieceActionContext = {
  // Convex execution context (dynamic at runtime)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  resolve: ResolveTemplates;
  scope: TemplateScope;
};

export type PieceActionDef = {
  name: string;
  // Simple props shape for UI/validation scaffolding
  props?: Record<string, "string" | "number" | "boolean" | "object" | "any">;
  run: (
    args: PieceActionContext & { props: Record<string, unknown> },
  ) => Promise<unknown>;
};

export type PieceDef = {
  name: string;
  actions: Record<string, PieceActionDef>;
};

export type PieceRegistry = Record<string, PieceDef>;
