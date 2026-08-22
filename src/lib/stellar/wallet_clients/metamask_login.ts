import toast from "react-hot-toast";
import { WalleteNextLogin } from "~/utils/next-login";
import { WalletType } from "../../../lib/enums";
import { addrShort, checkPubkey } from "../../../lib/utils";
import { showFundAccountToast } from "./fund_account_toast";
import { submitSignedXDRToServer } from "../utils";
import { formatErrorForLogging, parseStellarError, StellarTransactionError } from "../../error-handler";

const STELLAR_SNAP_ID = "npm:stellar-snap";
const isMainnet = process.env.NEXT_PUBLIC_STELLAR_PUBNET === "false" ? false : true;

type EthProvider = {
  isMetaMask?: boolean;
  providers?: EthProvider[];
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthProvider;
  }
}

function findMetaMaskProvider(): EthProvider | null {
  const eth = window.ethereum;
  if (!eth) return null;
  if (eth.providers) {
    const mm = eth.providers.find((p) => p.isMetaMask);
    if (mm) return mm;
  }
  return eth;
}

async function connectSnap(provider: EthProvider) {
  await provider.request({
    method: "wallet_requestSnaps",
    params: { [STELLAR_SNAP_ID]: {} },
  });
}

async function invokeSnap<T>(
  provider: EthProvider,
  method: string,
  params?: Record<string, unknown>,
): Promise<T> {
  return provider.request({
    method: "wallet_invokeSnap",
    params: { snapId: STELLAR_SNAP_ID, request: { method, params } },
  }) as Promise<T>;
}

export async function metamaskLogin() {
  const provider = findMetaMaskProvider();
  if (!provider) {
    toast.error("MetaMask is not installed. Please install MetaMask and try again.");
    return;
  }

  try {
    await connectSnap(provider);
  } catch {
    toast.error("Failed to connect Stellar Snap. Please try again.");
    return;
  }

  let pubkey: string;
  try {
    pubkey = await invokeSnap<string>(provider, "getAddress");
    console.log("[MetaMask] Stellar pubkey:", pubkey);
    console.log("[MetaMask] Network:", isMainnet ? "MAINNET" : "TESTNET");
    console.log(
      "[MetaMask] Fund this account on",
      isMainnet
        ? `https://stellar.expert/explorer/public/account/${pubkey}`
        : `https://stellar.expert/explorer/testnet/account/${pubkey}`,
    );
  } catch (e) {
    console.error("[MetaMask] getAddress error:", e);
    toast.error("Failed to get Stellar public key from MetaMask.");
    return;
  }

  if (checkPubkey(pubkey)) {
    toast.error("Login failed. Invalid public key returned by MetaMask.");
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
  console.log("[MetaMask] XDR to sign:", data.xdr);

  let signedXDR: string;
  try {
    const result = await invokeSnap<string | { signedTransaction: string }>(
      provider,
      "signTransaction",
      { transaction: data.xdr, testnet: !isMainnet },
    );
    console.log("[MetaMask] signTransaction raw result:", result);
    signedXDR = typeof result === "string" ? result : result.signedTransaction;
    console.log("[MetaMask] Signed XDR:", signedXDR);
  } catch (e) {
    const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? String(e);
    console.error("[MetaMask] signTransaction error:", e);
    console.error("[MetaMask] Account that needs funding:", pubkey);
    console.error(
      "[MetaMask] Fund it at:",
      isMainnet
        ? `https://stellar.expert/explorer/public/account/${pubkey}`
        : `https://friendbot.stellar.org/?addr=${pubkey}`,
    );
    toast.error(`Signing failed: ${msg}`);
    return;
  }

  const loginRes = await WalleteNextLogin({
    pubkey,
    signedXDR,
    walletType: WalletType.metamask,
  });

  if (loginRes?.ok) {
    toast.success("Login successful");
    toast.success("Public Key: " + addrShort(pubkey, 10));
  }

  if (loginRes?.error) {
    toast.error(loginRes.error);
  }
}

/** Sign-only counterpart to {@link metamaskSignAndSubmitXdr} — same Snap
 *  invocation, just returns the signed XDR instead of submitting it. */
export async function metamaskSignXdr(xdr: string, _pubKey: string): Promise<string | undefined> {
  const provider = findMetaMaskProvider();
  if (!provider) {
    toast.error("MetaMask is not installed.");
    return undefined;
  }

  try {
    await connectSnap(provider);
    const result = await invokeSnap<string | { signedTransaction: string }>(
      provider,
      "signTransaction",
      { transaction: xdr, testnet: !isMainnet },
    );
    return typeof result === "string" ? result : result.signedTransaction;
  } catch (e) {
    const parsedError = parseStellarError(e);
    console.error("Transaction Error:", formatErrorForLogging(e));
    throw new StellarTransactionError(parsedError);
  }
}

export async function metamaskSignAndSubmitXdr(xdr: string, _pubKey: string) {
  const provider = findMetaMaskProvider();
  if (!provider) {
    toast.error("MetaMask is not installed.");
    return;
  }

  try {
    await connectSnap(provider);

    // snap may return the signed XDR as a plain string or wrapped in an object
    const result = await invokeSnap<string | { signedTransaction: string }>(
      provider,
      "signTransaction",
      { transaction: xdr, testnet: !isMainnet },
    );

    const signedXDR =
      typeof result === "string" ? result : result.signedTransaction;

    return await submitSignedXDRToServer(signedXDR);
  } catch (e) {
    const parsedError = parseStellarError(e);
    console.error("Transaction Error:", formatErrorForLogging(e));
    throw new StellarTransactionError(parsedError);
  }
}
