/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { HOT } from "@hot-wallet/sdk";
import toast from "react-hot-toast";

import { WalleteNextLogin } from "~/utils/next-login";
import { WalletType } from "../../../lib/enums";
import { addrShort, checkPubkey } from "../../../lib/utils";
import { submitSignedXDRToServer } from "../utils";
import {
  formatErrorForLogging,
  parseStellarError,
  StellarTransactionError,
} from "../../error-handler";

function isHotAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window as Window & { hotExtension?: unknown }).hotExtension
  );
}

export async function hotWalletLogin() {
  if (!isHotAvailable()) {
    toast.error("HOT Wallet extension is not installed.");
    return;
  }

  let pubkey: string;
  try {
    const result = await HOT.request("stellar:getAddress", {});
    pubkey = (result as { address: string }).address;
  } catch (e) {
    console.error("HOT Wallet getAddress error:", e);
    toast.error("Failed to get address from HOT Wallet.");
    return;
  }

  if (checkPubkey(pubkey)) {
    toast.error("Login failed. Please try again after refreshing the page.");
    return;
  }

  const xdrRes = await toast.promise(fetch("/api/xdr?pubkey=" + pubkey), {
    error: "Error fetching XDR",
    loading: "Fetching XDR",
    success: "XDR fetched",
  });

  if (!xdrRes.ok) return;

  const data = (await xdrRes.json()) as { xdr: string };

  let signedXDR: string;
  try {
    const result = await HOT.request("stellar:signTransaction", {
      xdr: data.xdr,
      accountToSign: pubkey,
    });
    signedXDR = (result as { signedTxXdr: string }).signedTxXdr;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("HOT Wallet signTransaction error:", e);
    toast.error(`Signing failed: ${msg}`);
    return;
  }

  const loginRes = await WalleteNextLogin({
    pubkey,
    signedXDR,
    walletType: WalletType.hotWallet,
  });

  if (loginRes?.ok) {
    toast.success("Login successful");
    toast.success("Public Key: " + addrShort(pubkey, 10));
  }

  if (loginRes?.error) {
    toast.error(loginRes.error);
  }
}

export async function hotWalletSignXdr(
  xdr: string,
  publicKey: string,
): Promise<string | undefined> {
  try {
    const result = await HOT.request("stellar:signTransaction", {
      xdr,
      accountToSign: publicKey,
    });
    return (result as { signedTxXdr: string }).signedTxXdr;
  } catch (e) {
    console.error("HOT Wallet sign error:", e);
    return undefined;
  }
}

export async function hotWalletSignAndSubmitXdr(
  xdr: string,
  publicKey: string,
) {
  const signedXDR = await hotWalletSignXdr(xdr, publicKey);

  if (!signedXDR) return false;

  try {
    return await submitSignedXDRToServer(signedXDR);
  } catch (e) {
    const parsedError = parseStellarError(e);
    console.error("Transaction Error:", formatErrorForLogging(e));
    throw new StellarTransactionError(parsedError);
  }
}
