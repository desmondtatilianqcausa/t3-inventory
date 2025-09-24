"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";

import { Button } from "~/app/_components/ui/button";
import { FlowCanvas } from "../_builder/flow-canvas";
import { api } from "@/convex/_generated/api";
import { piecesAdapter } from "~/ui-adapters";
import { useParams } from "next/navigation";

type Graph = {
  nodes: Array<{ id: string; type: string; params?: Record<string, unknown> }>;
  edges: Array<{ from: string; to: string }>;
};

function ensureGraph(g: unknown): Graph {
  const def: Graph = { nodes: [], edges: [] };
  if (!g || typeof g !== "object") return def;
  const anyObj = g as Record<string, unknown>;
  const nodes = Array.isArray(anyObj.nodes)
    ? (anyObj.nodes as Graph["nodes"])
    : [];
  const edges = Array.isArray(anyObj.edges)
    ? (anyObj.edges as Graph["edges"])
    : [];
  return { nodes: [...nodes], edges: [...edges] };
}

function nextNodeId(nodes: Graph["nodes"]): string {
  let i = nodes.length + 1;
  while (nodes.some((n) => n.id === `n${i}`)) i++;
  return `n${i}`;
}

function ensureStartEnd(graph: Graph): Graph {
  const hasStart = graph.nodes.some((n) => n.type === "trigger.orderCreated");
  const hasEnd = graph.nodes.some((n) => n.type === "end");
  if (!hasStart)
    graph.nodes.unshift({ id: "start", type: "trigger.orderCreated" });
  if (!hasEnd) graph.nodes.push({ id: "end", type: "end" });
  if (
    graph.edges.length === 0 &&
    graph.nodes.find((n) => n.id === "start") &&
    graph.nodes.find((n) => n.id === "end")
  ) {
    graph.edges.push({ from: "start", to: "end" });
  }
  return graph;
}

export function BuilderMount() {
  const params = useParams();
  const workflowId = params?.workflowId as string;
  const wf = useQuery(api.workflows.queries.getById, {
    id: workflowId as unknown as any,
  });
  const saveDraft = useMutation(api.workflows.mutations.updateDraft);
  const pieces = useMemo(() => piecesAdapter.list(), []);

  const graph = useMemo(
    () => ensureStartEnd(ensureGraph(wf?.draftGraphJson)),
    [wf?.draftGraphJson],
  );
  const [localGraph, setLocalGraph] = useState<Graph>(graph);

  const addPieceNode = (pieceName: string, actionName: string) => {
    setLocalGraph((prev) => {
      const g: Graph = ensureStartEnd({
        nodes: [...prev.nodes],
        edges: [...prev.edges],
      });
      const id = nextNodeId(g.nodes);
      const type = `piece.${pieceName}.${actionName}`;
      const endIdx = g.nodes.findIndex((n) => n.id === "end");
      if (endIdx >= 0) g.nodes.splice(endIdx, 0, { id, type });
      else g.nodes.push({ id, type });
      const endId = "end";
      const incomingToEndIdx = g.edges.findIndex((e) => e.to === endId);
      if (incomingToEndIdx >= 0) {
        const from = g.edges[incomingToEndIdx].from;
        g.edges.splice(incomingToEndIdx, 1, { from, to: id });
        g.edges.push({ from: id, to: endId });
      } else {
        const last = g.nodes.filter((n) => n.id !== endId).at(-1);
        if (last)
          g.edges.push({ from: last.id, to: id }, { from: id, to: endId });
      }
      return g;
    });
  };

  const onSave = async () => {
    await saveDraft({
      id: workflowId as unknown as any,
      graphJson: localGraph,
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="space-y-2">
        <div className="text-sm font-medium">Pieces</div>
        <div className="h-[420px] overflow-auto rounded-md border p-2">
          {pieces.map((p) => (
            <div key={p.name} className="mb-3">
              <div className="mb-1 text-xs font-semibold">{p.name}</div>
              <div className="space-y-1">
                {p.actions.map((a) => (
                  <Button
                    key={a.name}
                    variant="secondary"
                    className="w-full justify-start"
                    onClick={() => addPieceNode(p.name, a.name)}
                  >
                    {a.name}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2 md:col-span-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Flow</div>
          <Button onClick={onSave}>Save Draft</Button>
        </div>
        <div className="h-[480px] rounded-md border p-3">
          <FlowCanvas
            setHasCanvasBeenInitialised={() => {}}
            lefSideBarContainerWidth={0}
          />
        </div>
      </div>
    </div>
  );
}
