"use client";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/app/_components/ui/form";

import { Button } from "~/app/_components/ui/button";
import { Input } from "~/app/_components/ui/input";
import { api } from "@/convex/_generated/api";
import { useForm } from "react-hook-form";
import { useMutation } from "convex/react";
import { useToast } from "~/app/_components/ui/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({ name: z.string().min(2, "Name is required") });

type FormValues = z.infer<typeof schema>;

export default function WorkflowForm({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const createWorkflow = useMutation(api.workflows.mutations.create);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await createWorkflow({ name: values.name });
      toast({ title: "Workflow created", description: values.name });
      form.reset({ name: "" });
      onSuccess?.();
    } catch (e) {
      toast({
        title: "Error",
        description:
          e instanceof Error ? e.message : "Failed to create workflow",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. order_to_monday" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" className="bg-green-700 hover:bg-green-600">
            Create
          </Button>
        </div>
      </form>
    </Form>
  );
}
