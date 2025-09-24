"use client";

import * as z from "zod";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  sendResetPassword,
  signInWithEmailAndPassword,
} from "../(auth)/actions";
import { useRouter, useSearchParams } from "next/navigation";

import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";

// Define the ResetPassFormSchema
const ResetPassFormSchema = z.object({
  email: z.string().email(),
});

// Extend ResetPassFormSchema to create LoginFormSchema
const LoginFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, {
    message: "Password is required.",
  }),
});

export default function LoginForm() {
  const router = useRouter();
  const [isResetPass, setIsResetPass] = useState(false);
  const loginForm = useForm<z.infer<typeof LoginFormSchema>>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const resetPassForm = useForm<z.infer<typeof ResetPassFormSchema>>({
    resolver: zodResolver(ResetPassFormSchema),
    defaultValues: { email: "" },
  });

  async function onSubmitLogin(data: z.infer<typeof LoginFormSchema>) {
    console.log("form submitted");
    const result = await signInWithEmailAndPassword(data);
    console.log("result", result);
    const { error } = result;

    if (error?.message) {
      toast({
        title: "You submitted the following values:",
        description: (
          <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
            <code className="text-white">{error.message}</code>
          </pre>
        ),
      });
    } else {
      toast({
        title: "Sucessfully Logged In!",
        // description: (
        //   <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
        //     Sucessfully Registered:
        //     <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        //   </pre>
        // ),
      });
      router.push("/");
    }
  }

  async function onSubmitResetPass(data: z.infer<typeof ResetPassFormSchema>) {
    console.log("form submitted");
    const result = await sendResetPassword(data.email);
    console.log("result", result);
    const { error } = result;

    if (error?.message) {
      toast({
        title: "There was an error sending the reset email!",
        description: "Please try again.",
      });
    } else {
      toast({
        title: "Sucessfully reset password!",
        description: "Please check your email for further instructions.",
      });
    }
  }

  return (
    <div className="flex flex-col items-center">
      {!isResetPass ? (
        <Form {...loginForm}>
          <form
            key={"login"}
            onSubmit={loginForm.handleSubmit(onSubmitLogin)}
            className="w-96 space-y-6"
          >
            <Card className="mx-auto  max-w-sm">
              <CardHeader>
                <CardTitle className="text-2xl">Login</CardTitle>
                <CardDescription>
                  Enter your email below to login to your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              className="text-black"
                              placeholder="example@gmail.com"
                              {...field}
                              type="email"
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-2">
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center">
                            <FormLabel>Password</FormLabel>
                          </div>
                          <FormControl>
                            <Input
                              className="text-black"
                              placeholder="password"
                              {...field}
                              type="password"
                              onChange={field.onChange}
                            />
                          </FormControl>

                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Login
                  </Button>
                </div>
                <Button
                  variant={"link"}
                  onClick={() => setIsResetPass(true)}
                  className="ml-auto inline-block p-0 text-sm underline"
                >
                  Forgot your password?
                </Button>
                <div className="mt-4 text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <Link href="/register" className="underline">
                    Sign up
                  </Link>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      ) : (
        <Form {...resetPassForm}>
          <form
            key={"resetpass"}
            onSubmit={resetPassForm.handleSubmit(onSubmitResetPass)}
            className="w-80 space-y-6"
          >
            <Card className="mx-auto max-w-sm">
              <CardHeader>
                <CardTitle className="text-2xl">Reset Password</CardTitle>
                <CardDescription>
                  Enter your email below to reset your password
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <FormField
                      control={resetPassForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              className="text-black"
                              placeholder="example@gmail.com"
                              {...field}
                              type="email"
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Reset Password
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <Link href="/register" className="underline">
                    Sign up
                  </Link>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      )}
    </div>
  );
}
