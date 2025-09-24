"use client";

import { Button } from "./ui/button";
import React from "react";
import { toast } from "./ui/use-toast";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";

const AuthButton = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ title: "Successfully logged out" });
      router.push("/login");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        title: "Logout failed",
        description: (
          <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
            <code className="text-white">{message}</code>
          </pre>
        ),
      });
    }
  };

  if (isLoading) return null;

  if (!isAuthenticated)
    return (
      <Button variant={"outline"} onClick={() => router.push("/login")}>
        Sign In
      </Button>
    );

  return (
    <Button variant={"outline"} onClick={handleSignOut}>
      Sign Out
    </Button>
  );
};

export default AuthButton;
