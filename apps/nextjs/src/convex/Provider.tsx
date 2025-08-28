"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";

import { env } from "~/env";

const convexUrl =
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  env.NEXT_PUBLIC_CONVEX_URL ?? "";
const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider(props: { children: React.ReactNode }) {
  return <ConvexProvider client={convex}>{props.children}</ConvexProvider>;
}
