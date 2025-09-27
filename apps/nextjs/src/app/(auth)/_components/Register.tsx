"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";

import { Button } from "~/app/_components/ui/button";
import { Input } from "~/app/_components/ui/input";
import { Label } from "~/app/_components/ui/label";
import { useToast } from "~/app/_components/ui/use-toast";
import { cn } from "~/lib/utils";

export function Register({
  className,
  ...props
}: {
  className?: string;
  props?: React.HTMLAttributes<HTMLDivElement>;
}) {
  const { signIn } = useAuthActions();
  const upsertProfile = useMutation(api.users.mutations.upsertProfile);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>Enter details to register</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setPending(true);
              try {
                const form = e.currentTarget as HTMLFormElement;
                const formData = new FormData(form);
                const name = String(formData.get("name") ?? "").trim();
                const email = String(formData.get("email") ?? "").trim();
                // Convex password flow with sign up
                formData.set("flow", "signUp");
                await signIn("password", formData);
                // Upsert profile with first/last name
                const [firstName, ...rest] = name.split(" ");
                const lastName = rest.join(" ").trim() || undefined;
                await upsertProfile({
                  email,
                  firstName: firstName || undefined,
                  lastName,
                });
                toast({ title: "Account created", description: "Welcome!" });
                // Hard redirect so middleware sees fresh auth cookie
                window.location.assign("/admin");
              } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
              } finally {
                setPending(false);
              }
            }}
          >
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Jane Doe"
                  required
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required />
              </div>
              {error ? (
                <div className="text-sm text-red-600">{error}</div>
              ) : null}
              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? "Creating account..." : "Create account"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
