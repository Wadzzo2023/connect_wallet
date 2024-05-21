import albedo, { type PublicKeyIntentResult } from "@albedo-link/intent";
import toast from "react-hot-toast";

import { WalletType } from "../../enums";
import { type ConnectWalletStateModel } from "../../../state/connect_wallet_state";
import { addrShort, checkPubkey } from "../../utils";
import NextLogin from "./next-login";
import { randomUUID } from "crypto";

export async function albedoLogin(walletState: ConnectWalletStateModel) {
  let userData: PublicKeyIntentResult;
  try {
    userData = await albedo.publicKey({ token: randomUUID() });
  } catch (e) {
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
  await NextLogin(userData.pubkey, userData.pubkey);
  walletState.setUserData(userData.pubkey, true, WalletType.albedo);
  toast.success("Public Key : " + addrShort(userData.pubkey, 10));
}

export async function getSingedXdrAlbedo(xdr: string, customer: string) {
  return albedo
    .tx({
      xdr: xdr,
      pubkey: customer,
      network: "public",
    })
    .then((res) => {
      console.info(
        res.xdr,
        res.tx_hash,
        res.signed_envelope_xdr,
        res.network,
        res.result,
        "aha",
      );
      return res.signed_envelope_xdr;
    })
    .catch((e) => {
      console.error(e);
      console.info("payment refected");
      console.info("payment refected");
      return undefined;
    });
}

export async function albedoSignTrx(xdr: string, customer: string) {
  return albedo
    .tx({
      xdr: xdr,
      pubkey: customer,
      network: "public",
      submit: true,
    })
    .then((res) => {
      console.info(res);

      // if (resB.horizonResult.successful !== undefined){
      //   return resB.horizonResult.successful as boolean
      // }
      return true;
    })
    .catch((e) => {
      console.info("payment refected", e);
      return false;
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
    .then((res) => {
      console.info(res);

      // if (resB.horizonResult.successful !== undefined){
      //   return resB.horizonResult.successful as boolean
      // }
      return true;
    })
    .catch((e) => {
      console.info("payment refected", e);
      return false;
    });
}
