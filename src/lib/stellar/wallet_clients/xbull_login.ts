import { xBullWalletConnect } from "@creit.tech/xbull-wallet-connect";
import toast from "react-hot-toast";

import { WalleteNextLogin } from "~/utils/next-login";
import { WalletType } from "../../../lib/enums";
import { addrShort, checkPubkey } from "../../../lib/utils";
import { showFundAccountToast } from "./fund_account_toast";
import { networkPassphrase } from "../constant";
import { submitSignedXDRToServer } from "../utils";
import { formatErrorForLogging, parseStellarError, StellarTransactionError } from "../../error-handler";

// xBull extension expects the full network passphrase string, not "PUBLIC"/"TESTNET"
// networkPassphrase from constant.ts is e.g. "Public Global Stellar Network ; September 2015"
const xbullNetworkPassphrase = networkPassphrase;

export async function xbullLogin() {
  let pubkey: string;
  const bridge = new xBullWalletConnect({ preferredTarget: "extension" });

  try {
    pubkey = await bridge.connect();
  } catch (e) {
    console.error("xBull connect error:", e);
    toast.error("xBull extension is not installed or connection was rejected.");
    return;
  } finally {
    bridge.closeConnections();
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

  if (!xdrRes.ok) {
    showFundAccountToast(pubkey);
    return;
  }

  const data = (await xdrRes.json()) as { xdr: string };

  let signedXDR: string;
  const signBridge = new xBullWalletConnect({ preferredTarget: "extension" });
  try {
    signedXDR = await signBridge.sign({
      xdr: data.xdr,
      publicKey: pubkey,
      network: xbullNetworkPassphrase,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("xBull sign error:", e);
    toast.error(`Signing failed: ${msg}`);
    return;
  } finally {
    signBridge.closeConnections();
  }

  const loginRes = await WalleteNextLogin({
    pubkey,
    signedXDR,
    walletType: WalletType.xBull,
  });

  if (loginRes?.ok) {
    toast.success("Login successful");
    toast.success("Public Key: " + addrShort(pubkey, 10));
  }

  if (loginRes?.error) {
    toast.error(loginRes.error);
  }
}

export async function xbullSignXdr(xdr: string, publicKey: string): Promise<string | undefined> {
  const bridge = new xBullWalletConnect({ preferredTarget: "extension" });
  try {
    return await bridge.sign({ xdr, publicKey, network: xbullNetworkPassphrase });
  } catch (e) {
    console.error("xBull sign error:", e);
    return undefined;
  } finally {
    bridge.closeConnections();
  }
}

export async function xbullSignAndSubmitXdr(xdr: string, publicKey: string) {
  const signedXDR = await xbullSignXdr(xdr, publicKey);

  if (!signedXDR) return false;

  try {
    return await submitSignedXDRToServer(signedXDR);
  } catch (e) {
    const parsedError = parseStellarError(e);
    console.error("Transaction Error:", formatErrorForLogging(e));
    throw new StellarTransactionError(parsedError);
  }
}
