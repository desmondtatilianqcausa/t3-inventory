import { NextResponse } from "next/server";

export async function GET() {
  const issuer = process.env.NEXT_PUBLIC_BASE_URL ?? "https://localhost:3001";
  const jwksUri = `${issuer}/api/auth/jwks`;
  return NextResponse.json({
    issuer,
    jwks_uri: jwksUri,
    id_token_signing_alg_values_supported: ["RS256"],
    response_types_supported: ["id_token"],
    subject_types_supported: ["public"],
  });
}
