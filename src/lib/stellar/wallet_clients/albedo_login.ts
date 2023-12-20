import albedo, { type PublicKeyIntentResult } from "@albedo-link/intent";
import toast from "react-hot-toast";

import log from "../../../../../../src/lib/logger/logger";
import { WalletType } from "package/connect_wallet/src/lib/enums";
import { type ConnectWalletStateModel } from "package/connect_wallet/src/state/connect_wallet_state";
import { checkPubkey, addrShort } from "~/lib/utils";

export async function albedoLogin(walletState: ConnectWalletStateModel) {
  let userData: PublicKeyIntentResult;
  try {
    userData = await albedo.publicKey({});
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
      log.info(
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
      log.error(e);
      log.info("payment refected");
      log.info("payment refected");
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
      log.info(res);

      // if (resB.horizonResult.successful !== undefined){
      //   return resB.horizonResult.successful as boolean
      // }
      return true;
    })
    .catch((e) => {
      log.info("payment refected", e);
      return false;
    });
}
