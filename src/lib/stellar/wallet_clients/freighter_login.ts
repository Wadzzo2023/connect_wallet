import toast from "react-hot-toast";
import freighter, { signTransaction } from "@stellar/freighter-api";

import { WalletType } from "../../../lib/enums";
import {
  useConnectWalletStateStore,
  type ConnectWalletStateModel,
} from "../../../state/connect_wallet_state";
import { checkPubkey, addrShort } from "../../../lib/utils";
import { submitSignedXDRToServer } from "../utils";
import NextLogin from "./next-login";

export async function freighterLogin() {
  const walletState = useConnectWalletStateStore();
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
    toast.success(`${pubkey}`);
    const data = await freighter.signBlob("vong");

    toast.success(data);
    return;
  }

  await NextLogin(pubkey, pubkey);
  walletState.setUserData(pubkey, true, WalletType.frieghter);
  toast.success("Public Key : " + addrShort(pubkey, 10));
}

export const userSignTransaction = async (xdr: string, signWith: string) => {
  let signedTransaction = "";
  let error: unknown;

  try {
    signedTransaction = await signTransaction(xdr, {
      network: "PUBLIC",
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
      network: "PUBLIC",
      accountToSign: signWith,
    });
    const res = await submitSignedXDRToServer(signedXDR);
    return res.successful;
  } catch (e) {
    console.info("freighter error", e);
    return false;
  }
};
