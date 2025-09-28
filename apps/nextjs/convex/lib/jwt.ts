import type { JWK } from "jose";
import { exportJWK, importPKCS8, SignJWT } from "jose";

const ALG = "RS256";
const KID = process.env.JWT_KID ?? "convex-key-1";

export async function loadPrivateKey(): Promise<CryptoKey> {
  const pkcs8 = (process.env.JWT_PRIVATE_KEY ?? "").replaceAll("\\n", "\n");
  if (!pkcs8) throw new Error("JWT_PRIVATE_KEY missing");
  return await importPKCS8(pkcs8, ALG, { extractable: true });
}

export async function createPublicJwkSet(): Promise<{ keys: JWK[] }> {
  const privateKey = await loadPrivateKey();
  const jwk = await exportJWK(privateKey);
  // Remove private parameters to expose only the public components
  delete (jwk as any).d;
  delete (jwk as any).p;
  delete (jwk as any).q;
  delete (jwk as any).dp;
  delete (jwk as any).dq;
  delete (jwk as any).qi;
  delete (jwk as any).oth;
  (jwk as any).alg = ALG;
  (jwk as any).use = "sig";
  (jwk as any).kid = KID;
  return { keys: [jwk as JWK] };
}

export async function signJwt(
  sub: string,
  issuer: string,
  audience: string,
  ttlSeconds = 900,
  claims: Record<string, unknown> = {},
): Promise<string> {
  const key = await loadPrivateKey();
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ ...claims })
    .setProtectedHeader({ alg: ALG, kid: KID })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .setSubject(sub)
    .setIssuer(issuer)
    .setAudience(audience)
    .sign(key);
}
