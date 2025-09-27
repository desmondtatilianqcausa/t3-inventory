"use client";

import React from "react";
import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";

export default function ResetPage() {
  const { signIn } = useAuthActions();
  const [step, setStep] = React.useState<"forgot" | { email: string }>(
    "forgot",
  );
  const clearReset = useMutation(
    api.users.mutations.clearMustResetPasswordByEmail,
  );

  return step === "forgot" ? (
    <form
      className="mx-auto mt-16 flex max-w-sm flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        void signIn("password", formData).then(() =>
          setStep({ email: formData.get("email") as string }),
        );
      }}
    >
      <h1 className="text-xl font-semibold">Reset your password</h1>
      <input
        name="email"
        placeholder="Email"
        type="text"
        className="border p-2"
      />
      <input name="flow" type="hidden" value="reset" />
      <button type="submit" className="rounded bg-black p-2 text-white">
        Send code
      </button>
    </form>
  ) : (
    <form
      className="mx-auto mt-16 flex max-w-sm flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        await signIn("password", formData);
        await clearReset({ email: step.email });
        window.location.assign("/login");
      }}
    >
      <h1 className="text-xl font-semibold">Enter code & new password</h1>
      <input
        name="code"
        placeholder="Code"
        type="text"
        className="border p-2"
      />
      <input
        name="newPassword"
        placeholder="New password"
        type="password"
        className="border p-2"
      />
      <input name="email" value={step.email} type="hidden" />
      <input name="flow" value="reset-verification" type="hidden" />
      <button type="submit" className="rounded bg-black p-2 text-white">
        Continue
      </button>
      <button
        type="button"
        className="rounded border p-2"
        onClick={() => setStep("forgot")}
      >
        Cancel
      </button>
    </form>
  );
}
