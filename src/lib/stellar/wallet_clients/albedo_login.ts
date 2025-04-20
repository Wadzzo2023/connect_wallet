import albedo, { type PublicKeyIntentResult } from "@albedo-link/intent";
import toast from "react-hot-toast";

import { AlbedoNextLogin } from "~/utils/next-login";
import { WalletType } from "../../enums";
import { addrShort, checkPubkey } from "../../utils";

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
