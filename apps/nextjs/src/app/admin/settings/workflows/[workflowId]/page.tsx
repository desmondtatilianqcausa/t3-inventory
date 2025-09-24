"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";

import { BuilderMount } from "../_components/BuilderMount";
import { Button } from "~/app/_components/ui/button";
import { Textarea } from "~/app/_components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { useToast } from "~/app/_components/ui/use-toast";

export default function WorkflowEditorPage() {
  const params = useParams();
  const workflowId = params?.workflowId as string;
  const { toast } = useToast();

  const wf = useQuery(api.workflows.queries.getById, { id: workflowId as any });
  const versions = useQuery(api.workflows.queries.getVersions, {
    workflowId: workflowId as any,
  });

  const updateDraft = useMutation(api.workflows.mutations.updateDraft);
  const publish = useMutation(api.workflows.mutations.publish);

  const [draftText, setDraftText] = useState<string>(() =>
    JSON.stringify(wf?.draftGraphJson ?? { nodes: [], edges: [] }, null, 2),
  );
  const [tab, setTab] = useState<"builder" | "json">("builder");

  // Sync editor when workflow data loads/changes so seeded drafts appear
  useEffect(() => {
    if (!wf) return;
    const nextJson = JSON.stringify(
      wf.draftGraphJson ?? { nodes: [], edges: [] },
      null,
      2,
    );
    setDraftText(nextJson);
  }, [wf?.draftGraphJson, wf?._id]);

  const onValidateAndSave = async () => {
    try {
      const parsed = JSON.parse(draftText);
      await updateDraft({ id: workflowId as any, graphJson: parsed });
      toast({ title: "Draft saved" });
    } catch (e) {
      toast({
        title: "Invalid JSON",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const onPublish = async () => {
    try {
      await publish({ id: workflowId as any });
      toast({ title: "Published new version" });
    } catch (e) {
      toast({
        title: "Publish failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Workflow Editor</h1>
        <div className="flex gap-2">
          <Button onClick={onValidateAndSave}>Validate & Save Draft</Button>
          <Button
            onClick={onPublish}
            className="bg-green-700 hover:bg-green-600"
          >
            Publish
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={tab === "builder" ? "default" : "secondary"}
          onClick={() => setTab("builder")}
        >
          Builder
        </Button>
        <Button
          variant={tab === "json" ? "default" : "secondary"}
          onClick={() => setTab("json")}
        >
          JSON
        </Button>
      </div>

      {tab === "builder" ? (
        <BuilderMount />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="mb-2 text-lg font-medium">Draft Graph JSON</h2>
            <Textarea
              className="min-h-[400px] font-mono"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
            />
          </div>
          <div>
            <h2 className="mb-2 text-lg font-medium">Info</h2>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Name:</strong> {wf?.name}
              </div>
              <div>
                <strong>Status:</strong> {wf?.status}
              </div>
              <div>
                <strong>Versions:</strong>
              </div>
              <ul className="list-disc pl-5">
                {(versions ?? []).map((v) => (
                  <li key={String(v._id)}>
                    v{v.version} ({new Date(v.createdAt).toLocaleString()})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
