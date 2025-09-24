"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@acme/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@acme/ui/components/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@acme/ui/components/form";
import { Input } from "@acme/ui/components/input";
import { cn } from "@acme/ui/lib/utils";

interface WordPressAuthResponse {
  email: string;
  password: string;
  wordpressToken: string;
  message?: string;
}

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof formSchema>;

export interface SSOProvider {
  id: string;
  name: string;
  icon?: React.ElementType;
  iconPath?: string;
  signIn?: () => Promise<void> | void;
}

export interface LoginFormProps {
  className?: string;
  providers?: SSOProvider[];
  title?: string;
  description?: string;
  onSubmit?: (data: FormData) => Promise<void>;
}

export function LoginForm({
  className,
  providers = [],
  title = "Welcome back",
  description = "Sign in to your account",
  onSubmit: customOnSubmit,
}: LoginFormProps) {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  // const { setOpen } = useModal();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isLoaded) {
    return null;
  }

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    try {
      if (customOnSubmit) {
        await customOnSubmit(data);
      } else if (signIn) {
        // Default WordPress + Clerk authentication logic
        const wpResponse = await fetch("/api/auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: data.email,
            password: data.password,
          }),
        });

        const wpResult = (await wpResponse.json()) as WordPressAuthResponse;
        console.log("WP Result:", wpResult);

        if (!wpResponse.ok) {
          throw new Error(wpResult.message ?? "Failed to login");
        }

        const result = await signIn.create({
          identifier: wpResult.email,
          password: wpResult.password,
        });

        if (result.status === "complete") {
          await setActive({ session: result.createdSessionId });
          router.push("/");
        } else {
          console.error("Unexpected Clerk response:", result);
          throw new Error("Failed to complete login");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      toast(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {providers.length > 0 && (
          <>
            <div className="grid gap-2">
              {providers.map((provider) => (
                <Button
                  key={provider.id}
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (provider.signIn) {
                      const result = provider.signIn();
                      if (result instanceof Promise) {
                        void result;
                      }
                    }
                  }}
                >
                  {provider.icon && <provider.icon className="mr-2 h-4 w-4" />}
                  Sign in with {provider.name}
                </Button>
              ))}
            </div>
            <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
              <span className="relative z-10 bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="m@example.com"
                      type="email"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <a
                      href="#"
                      className="text-sm underline-offset-4 hover:underline"
                      onClick={(e) => {
                        e.preventDefault();
                        router.push("/reset-password");
                      }}
                    >
                      Forgot your password?
                    </a>
                  </div>
                  <FormControl>
                    <Input type="password" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Login"}
            </Button>
          </form>
        </Form>
        <div className="text-center text-sm">
          Don&apos;t have an account?{" "}
          <a
            href="#"
            className="underline underline-offset-4"
            onClick={(e) => {
              e.preventDefault();
              router.push("/sign-up");
            }}
          >
            Sign up
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
