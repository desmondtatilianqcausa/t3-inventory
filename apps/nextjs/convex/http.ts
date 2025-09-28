import { httpRouter } from "convex/server";

import { httpAction } from "./_generated/server";

const http = httpRouter();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
};

http.route({
  path: "/.well-known/openid-configuration",
  method: "GET",
  handler: httpAction(async (ctx, _req) => {
    const issuer = process.env.CONVEX_SITE_URL!;
    const jwksUri = `${issuer}/api/auth/jwks`;
    console.log("[CONVEX OIDC] discovery", { issuer, jwksUri });
    return new Response(
      JSON.stringify({
        issuer,
        jwks_uri: jwksUri,
        id_token_signing_alg_values_supported: ["RS256"],
        response_types_supported: ["id_token"],
        subject_types_supported: ["public"],
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }),
});

http.route({
  path: "/.well-known/jwks.json",
  method: "GET",
  handler: httpAction(async () => {
    try {
      const { createPublicJwkSet } = await import("./lib/jwt");
      const jwks = await createPublicJwkSet();
      console.log("[CONVEX OIDC] jwks .well-known", {
        hasKeys: !!jwks?.keys?.length,
      });
      return new Response(JSON.stringify({ keys: jwks.keys }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } catch (e) {
      console.error("[CONVEX OIDC] jwks .well-known error", e);
      return new Response("error", { status: 500, headers: corsHeaders });
    }
  }),
});

http.route({
  path: "/api/auth/jwks",
  method: "GET",
  handler: httpAction(async () => {
    try {
      const { createPublicJwkSet } = await import("./lib/jwt");
      const jwks = await createPublicJwkSet();
      console.log("[CONVEX OIDC] jwks", { hasKeys: !!jwks?.keys?.length });
      return new Response(JSON.stringify({ keys: jwks.keys }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } catch (e) {
      console.error("[CONVEX OIDC] jwks error", e);
      return new Response("error", { status: 500, headers: corsHeaders });
    }
  }),
});

http.route({
  path: "/api/auth/issue-token",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/auth/issue-token",
  method: "GET",
  handler: httpAction(async () => {
    console.log("[CONVEX OIDC] issue-token GET (expected POST)");
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }),
});

http.route({
  path: "/api/auth/issue-token",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const body = await req.json();
      const email = String(body?.email ?? "");
      console.log("[CONVEX OIDC] issue-token", { emailPresent: !!email });
      if (!email)
        return new Response("invalid email", {
          status: 400,
          headers: corsHeaders,
        });
      const issuer = process.env.CONVEX_SITE_URL!;
      const aud = process.env.NEXT_CONVEX_OIDC_AUD ?? issuer;
      const { signJwt } = await import("./lib/jwt");
      const token = await signJwt(email, issuer, aud, 10 * 60, { email });
      console.log("[CONVEX OIDC] token issued", { aud, issuer });
      return new Response(JSON.stringify({ token }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } catch (e) {
      console.error("[CONVEX OIDC] issue-token error", e);
      return new Response("error", { status: 500, headers: corsHeaders });
    }
  }),
});

export default http;
