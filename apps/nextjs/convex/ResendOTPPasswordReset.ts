import AuthResend from "@auth/core/providers/resend";
import { Resend as ResendClient } from "@convex-dev/resend";
import { generateRandomString, RandomReader } from "@oslojs/crypto/random";
import { Resend as ResendSDK } from "resend";

import { components } from "./_generated/api";

export const resend: ResendClient = new ResendClient(components.resend, {});

export const ResendOTPPasswordReset = AuthResend({
  id: "resend-otp",
  apiKey: process.env.RESEND_API_KEY,
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes) {
        crypto.getRandomValues(bytes);
      },
    };

    const alphabet = "0123456789";
    const length = 8;
    return generateRandomString(random, alphabet, length);
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const client = new ResendSDK((provider.apiKey as string) ?? "");
    const { error } = await client.emails.send({
      from: "D5 Inventory <no-reply@d5.example>",
      to: [email as string],
      subject: `Reset your password`,
      text: "Your password reset code is " + token,
    });

    if (error) {
      throw new Error("Could not send");
    }
  },
});
