import toast from "react-hot-toast";

import { WalleteNextLogin } from "~/utils/next-login";
import { WalletType } from "../../../lib/enums";
import { addrShort, checkPubkey } from "../../../lib/utils";
import { showFundAccountToast } from "./fund_account_toast";
import { submitSignedXDRToServer } from "../utils";
import { formatErrorForLogging, parseStellarError, StellarTransactionError } from "../../error-handler";
import { networkPassphrase } from "../constant";

declare global {
  interface Window {
    hanaWallet?: {
      stellar?: {
        getPublicKey(): Promise<string>;
        signTransaction(params: {
          xdr: string;
          accountToSign?: string;
          networkPassphrase?: string;
        }): Promise<string>;
      };
    };
  }
}

async function checkHanaAvailable(): Promise<boolean> {
  return typeof window !== "undefined" && !!window.hanaWallet?.stellar;
}

export async function hanaLogin() {
  if (!(await checkHanaAvailable())) {
    toast.error("Hana Wallet extension is not installed.");
    return;
  }

  let pubkey: string;
  try {
    pubkey = await window.hanaWallet!.stellar!.getPublicKey();
    console.log("Hana getPublicKey result:", pubkey);
  } catch (e) {
    console.error("Hana getPublicKey error:", e);
    toast.error("Failed to get public key from Hana Wallet.");
    return;
  }

  if (checkPubkey(pubkey)) {
    toast.error("Login failed. Please try again after refreshing the page.");
    return;
  }
  console.log("Network Passphrase:", networkPassphrase);
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
  try {
    signedXDR = await window.hanaWallet!.stellar!.signTransaction({
      xdr: data.xdr,
      accountToSign: pubkey,
      networkPassphrase: networkPassphrase,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Hana signTransaction error:", e);
    toast.error(`Signing failed: ${msg}`);
    return;
  }

  const loginRes = await WalleteNextLogin({
    pubkey,
    signedXDR,
    walletType: WalletType.hana,
  });

  if (loginRes?.ok) {
    toast.success("Login successful");
    toast.success("Public Key: " + addrShort(pubkey, 10));
  }

  if (loginRes?.error) {
    toast.error(loginRes.error);
  }
}

export async function hanaSignXdr(xdr: string, publicKey: string): Promise<string | undefined> {
  if (!(await checkHanaAvailable())) return undefined;
  try {
    return await window.hanaWallet!.stellar!.signTransaction({
      xdr,
      accountToSign: publicKey,
      networkPassphrase: networkPassphrase,
    });
  } catch (e) {
    console.error("Hana sign error:", e);
    return undefined;
  }
}

export async function hanaSignAndSubmitXdr(xdr: string, publicKey: string) {
  const signedXDR = await hanaSignXdr(xdr, publicKey);

  if (!signedXDR) return false;

  try {
    return await submitSignedXDRToServer(signedXDR);
  } catch (e) {
    const parsedError = parseStellarError(e);
    console.error("Transaction Error:", formatErrorForLogging(e));
    throw new StellarTransactionError(parsedError);
  }
}
