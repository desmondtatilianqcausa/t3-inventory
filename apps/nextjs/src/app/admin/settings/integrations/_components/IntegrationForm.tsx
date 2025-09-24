"use client";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/app/_components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/app/_components/ui/select";

import { Button } from "~/app/_components/ui/button";
import { Input } from "~/app/_components/ui/input";
import React from "react";
import { api } from "@/convex/_generated/api";
import { useForm } from "react-hook-form";
import { useMutation } from "convex/react";
import { useToast } from "~/app/_components/ui/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  kind: z.enum(["monday", "wordpress", "webhook"]),
});

type FormValues = z.infer<typeof schema>;

export default function IntegrationForm({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const createMondayIntegration = useMutation(
    api.monday.mutations.createIntegration,
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", kind: "monday" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      if (values.kind === "monday") {
        await createMondayIntegration({ name: values.name });
        toast({
          title: "Integration created",
          description: `Created ${values.name} (${values.kind})`,
        });
        onSuccess?.();
        form.reset({ name: "", kind: values.kind });
      } else {
        toast({
          title: "Not implemented",
          description: `${values.kind} is not implemented yet.`,
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Error",
        description:
          e instanceof Error ? e.message : "Failed to create integration",
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
                <Input {...field} placeholder="e.g. Monday Main" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="monday">Monday.com</SelectItem>
                  <SelectItem value="wordpress">WordPress</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="submit" className="bg-green-700 hover:bg-green-600">
            Create
          </Button>
        </div>
      </form>
    </Form>
  );
}
