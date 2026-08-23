import albedo, { type PublicKeyIntentResult } from "@albedo-link/intent";
import toast from "react-hot-toast";

import { AlbedoNextLogin } from "~/utils/next-login";
import { WalletType } from "../../enums";
import { addrShort, checkPubkey } from "../../utils";
import { formatErrorForLogging, parseStellarError, StellarTransactionError } from "../../error-handler";

export async function albedoLogin() {
  const token = Math.random().toString(36).substring(2, 12);
  let userData: PublicKeyIntentResult;
  try {
    userData = await albedo.publicKey({ token: token });
  } catch (e) {
    console.error(e);
    toast.error(
      "Login failed. Please try to login again after refreshing the page.",
    );
    return;
  }

  if (checkPubkey(userData.pubkey)) {
    toast.error(
      "Login failed. Please try to login again after refreshing the page.",
    );
    return;
  }

  // console.log(userData);
  const res = await toast.promise(
    AlbedoNextLogin({
      pubkey: userData.pubkey,
      signature: userData.signature,
      token: token,
      walletType: WalletType.albedo,
    }),
    { error: "Login error", loading: "Please wait", success: null },
  );

  if (res?.ok) {
    toast.success("Public Key : " + addrShort(userData.pubkey, 10));
  }
  if (res?.error) toast.error(res.error);
}

/**
 * Sign-only counterpart to {@link albedoSignTrx}/{@link albedoSignTrxInTestNet}
 * — same intent call, minus `submit: true`, so Albedo returns a signed
 * envelope without broadcasting it. `isTestnet` picks the network the same
 * way `clientsign`'s own `props.test` flag does for the sign-and-submit
 * variants; this used to be hardcoded to `"public"` regardless of the
 * actual configured network, which would have signed for the wrong chain
 * on testnet.
 */
export async function getSingedXdrAlbedo(
  xdr: string,
  customer: string,
  isTestnet: boolean,
): Promise<string | undefined> {
  try {
    const res = await albedo.tx({
      xdr,
      pubkey: customer,
      network: isTestnet ? "testnet" : "public",
    });
    return res.signed_envelope_xdr;
  } catch (e) {
    const parsedError = parseStellarError(e);
    console.error("Transaction Error:", formatErrorForLogging(e));
    throw new StellarTransactionError(parsedError);
  }
}

export async function albedoSignTrx(xdr: string, customer: string) {
  return albedo
    .tx({
      xdr: xdr,
      pubkey: customer,
      network: "public",
      submit: true,
    })

    .catch((e) => {
      const parsedError = parseStellarError(e);
      console.error("Transaction Error:", formatErrorForLogging(e));
      throw new StellarTransactionError(parsedError);
    });
}

export async function albedoSignTrxInTestNet(xdr: string, customer: string) {
  return albedo
    .tx({
      xdr: xdr,
      pubkey: customer,
      network: "testnet",
      submit: true,
    })

    .catch((e) => {
      const parsedError = parseStellarError(e);
      console.error("Transaction Error:", formatErrorForLogging(e));
      throw new StellarTransactionError(parsedError);
    });
}
