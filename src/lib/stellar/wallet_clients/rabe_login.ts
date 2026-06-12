/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import toast from "react-hot-toast";
import { WalleteNextLogin } from "~/utils/next-login";
import { WalletType } from "../../../lib/enums";
import { addrShort, checkPubkey } from "../../../lib/utils";
import { submitSignedXDRToServer } from "../utils";
import { formatErrorForLogging, parseStellarError, StellarTransactionError } from "../../error-handler";
import { networkPassphrase } from "../constant";

interface ConnectResult {
  publicKey: string;
  error?: string;
}

interface SignResult {
  xdr: string;
  error: string;
}

// Rabet uses "mainnet" / "testnet" (not "PUBLIC" / "TESTNET")
const rabetNetwork = networkPassphrase

export async function rabetLogin() {
  const rabet = (window as any).rabet;

  if (!rabet) {
    toast.error("Rabet extension is not installed. Install Rabet and try again.");
    return;
  }

  let pubkey: string;
  try {
    const result = await (rabet.connect() as Promise<ConnectResult>);
    pubkey = result.publicKey;
  } catch (e: any) {
    toast.error(e.error ?? "Rabet connection failed.");
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
    const result = await (rabet.sign(data.xdr, rabetNetwork) as Promise<SignResult>);
    if (!result.xdr) {
      toast.error("Signing failed. Please try again.");
      return;
    }
    signedXDR = result.xdr;
  } catch (e: any) {
    toast.error(e.error ?? "Transaction signing cancelled or failed.");
    return;
  } finally {
    await (rabet.disconnect() as Promise<void>);
  }

  const loginRes = await WalleteNextLogin({
    pubkey,
    signedXDR,
    walletType: WalletType.rabet,
  });

  if (loginRes?.ok) {
    toast.success("Login successful");
    toast.success("Public Key: " + addrShort(pubkey, 10));
  }

  if (loginRes?.error) {
    toast.error(loginRes.error);
  }
}

export async function rabetXdrSingXdr(xdr: string, _pubKey: string): Promise<string | undefined> {
  const rabet = (window as any).rabet;

  if (!rabet) {
    toast.error("Rabet extension is not installed. Install Rabet and try again.");
    return undefined;
  }

  await (rabet.connect() as Promise<ConnectResult>);

  let signed_xdr: string | undefined;
  try {
    const result = await (rabet.sign(xdr, rabetNetwork) as Promise<SignResult>);
    signed_xdr = result.xdr;
  } catch (e: any) {
    console.error("Rabet sign error:", e);
  } finally {
    await (rabet.disconnect() as Promise<void>);
  }

  return signed_xdr;
}

export async function rabetXdrSingXdrAndSubmit(xdr: string, pubKey: string) {
  const signed_xdr = await rabetXdrSingXdr(xdr, pubKey);

  if (!signed_xdr) return false;

  try {
    return await submitSignedXDRToServer(signed_xdr);
  } catch (e) {
    const parsedError = parseStellarError(e);
    console.error("Transaction Error:", formatErrorForLogging(e));
    throw new StellarTransactionError(parsedError);
  }
}
