import { createPrivateKey, createPublicKey } from "crypto";
import { exportJWK, importPKCS8, JWK, SignJWT } from "jose";

const ALG = "RS256";

export async function loadPrivateKey(): Promise<CryptoKey> {
  const pkcs8 = process.env.JWT_PRIVATE_KEY?.replaceAll("\\n", "\n");
  if (!pkcs8) throw new Error("JWT_PRIVATE_KEY missing");
  return await importPKCS8(pkcs8, ALG);
}

export async function createPublicJwkSet(): Promise<{ keys: JWK[] }> {
  const pkcs8 = process.env.JWT_PRIVATE_KEY?.replaceAll("\\n", "\n");
  if (!pkcs8) throw new Error("JWT_PRIVATE_KEY missing");
  const priv = createPrivateKey({ key: pkcs8, format: "pem" });
  const pub = createPublicKey(priv);
  const jwk = await exportJWK(pub);
  (jwk as any).alg = ALG;
  (jwk as any).use = "sig";
  return { keys: [jwk as JWK] };
}

export async function signJwt(
  sub: string,
  issuer: string,
  audience: string,
  ttlSeconds = 900,
): Promise<string> {
  const key = await loadPrivateKey();
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({})
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .setSubject(sub)
    .setIssuer(issuer)
    .setAudience(audience)
    .sign(key);
}
