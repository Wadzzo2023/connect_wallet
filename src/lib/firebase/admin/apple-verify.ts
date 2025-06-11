/* eslint-disable */
import jwksClient from "jwks-rsa";
import jwt from "jsonwebtoken";

const client = jwksClient({
  jwksUri: "https://appleid.apple.com/auth/keys",
});

export async function verifyAppleToken(identityToken: string) {
  // Get Apple's public key
  const decodedToken = jwt.decode(identityToken, { complete: true });
  const kid = decodedToken?.header.kid;
  const key = await client.getSigningKey(kid);
  const publicKey = key.getPublicKey();

  // Verify token
  return jwt.verify(identityToken, publicKey, {
    algorithms: ["RS256"],
    audience: "com.actionverse.actiontokens", // Your app's identifier
  });
}
