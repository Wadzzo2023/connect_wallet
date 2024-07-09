import freighter, { signTransaction } from "@stellar/freighter-api";
import toast from "react-hot-toast";

import { WalleteNextLogin } from "~/utils/next-login";
import { WalletType } from "../../../lib/enums";
import { addrShort, checkPubkey } from "../../../lib/utils";
import { submitSignedXDRToServer } from "../utils";

const network = process.env.NEXT_PUBLIC_STELLAR_PUBNET ? "PUBLIC" : "TESTNET";

export async function freighterLogin() {
  let pubkey: string;
  const freighterConnected = await freighter.isConnected();
  if (!freighterConnected) {
    toast.error(
      "Freighter extension is not installed. Install Freighter and try again",
    );
    return;
  }
  try {
    pubkey = await freighter.getPublicKey();
  } catch (e) {
    toast.error(
      "Login failed. Please try to login again after refreshing the page.",
    );
    return;
  }

  if (checkPubkey(pubkey)) {
    toast.error(
      "Login failed. Please try to login again after refreshing the page.",
    );
    return;
  }

  if (pubkey) {
    const xdrRes = await toast.promise(fetch("/api/xdr?pubkey=" + pubkey), {
      error: "Error fetching XDR",
      loading: "Fetching XDR",
      success: "XDR fetched",
    });
    if (xdrRes.ok) {
      const data = (await xdrRes.json()) as { xdr: string };
      // console.log(data);
      const toastId = toast.loading("Please wait");

      const signedXDR = await signTransaction(data.xdr, {
        network,
        accountToSign: pubkey,
      });

      const loginRes = await WalleteNextLogin({
        pubkey,
        signedXDR: signedXDR,
        walletType: WalletType.frieghter,
      });

      if (loginRes?.ok) {
        toast.success("Login successful");
        toast.success("Public Key : " + addrShort(pubkey, 10));
      }

      if (loginRes?.error) {
        toast.error(loginRes.error);
      }
    }
  } else {
    toast.error("Extension not connected. Please try again.");
  }
}

export const userSignTransaction = async (xdr: string, signWith: string) => {
  let signedTransaction = "";
  let error: unknown;

  try {
    signedTransaction = await signTransaction(xdr, {
      network,
      accountToSign: signWith,
    });
  } catch (e) {
    error = e;
  }

  if (error) {
    console.error("freighter: ", error);
    return;
  }

  return signedTransaction;
};

export const freighterSignTrx = async (xdr: string, signWith: string) => {
  try {
    const signedXDR = await signTransaction(xdr, {
      network,
      accountToSign: signWith,
    });
    const res = await submitSignedXDRToServer(signedXDR);
    return res.successful;
  } catch (e) {
    console.info("freighter error", e);
    return false;
  }
};
