/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import toast from "react-hot-toast";
import { WalletType } from "../../../lib/enums";
import {
  useConnectWalletStateStore,
  type ConnectWalletStateModel,
} from "../../../state/connect_wallet_state";
import { checkPubkey, addrShort } from "../../../lib/utils";
import { submitSignedXDRToServer } from "../utils";
import NextLogin from "./next-login";
import { networkPassphrase } from "../constant";
import { GetDummyXDR } from "../trx/deummy";
import { api } from "~/utils/api";
import { RabetNextLogin } from "~/utils/next-login";

interface ConnectResult {
  publicKey: string;
  error?: string;
}
const network = process.env.NEXT_PUBLIC_STELLAR_PUBNET ? "mainnet" : "testnet";

export async function rabetLogin() {
  let pubkey: string;
  const rabet = (window as any).rabet;

  if (!rabet) {
    toast.error(
      "Rabet extension is not installed. Install Rabet and try again",
    );
    return;
  }

  try {
    let result = await (rabet.connect() as Promise<ConnectResult>);
    pubkey = result.publicKey;
    // await (rabet.disconnect() as Promise<void>);
  } catch (e: any) {
    toast.error(e.error);
    return;
  }

  if (checkPubkey(pubkey)) {
    toast.error(
      "Login failed. Please try to login again after refreshing the page.",
    );
    return;
  }

  // now pubkey is valid
  try {
    const xdrRes = await fetch("/api/xdr?pubkey=" + pubkey);
    if (xdrRes.ok) {
      const data = (await xdrRes.json()) as { xdr: string };
      console.log(data);
      const toastId = toast.loading("Please wait");
      rabet
        .sign(data.xdr, network)
        .then(async (result: SignResult) => {
          if (result.xdr) {
            const loginRes = await RabetNextLogin({
              pubkey,
              signedXDR: result.xdr,
              walletType: WalletType.rabet,
            });

            if (loginRes?.ok) {
              toast.success("Login successful");
            }

            if (loginRes?.error) {
              toast.error(loginRes.error);
            }
          } else {
            toast.error("XDR signing failed");
          }
        })
        .catch((error: any) => {
          console.log(error);
        })
        .finally(async () => {
          toast.dismiss(toastId);
          await (rabet.disconnect() as Promise<void>);
        });

      // await NextLogin(pubkey, pubkey);
      // walletState.setUserData(pubkey, true, WalletType.rabet);
      toast.success("Public Key : " + addrShort(pubkey, 10));
    }
  } catch (e) {
    console.error(e);
  }
}

export async function rabetXdrSingXdr(xdr: string, pubKey: string) {
  console.info(pubKey);

  let rabet: any;
  if (!(window as any).rabet) {
    toast.error(
      "Rabet extension is not installed. Install Rabet and try again",
    );
    return undefined;
  } else {
    rabet = (window as any).rabet;
  }

  await (rabet.connect() as Promise<ConnectResult>);
  let signed_xdr: string | undefined;
  await rabet
    .sign(xdr, network)
    .then(function (result: SignResult) {
      signed_xdr = result.xdr;
    })
    .catch(function (error: any) {
      console.error(`Error: ${error.message}`);
      return undefined;
    });

  await (rabet.disconnect() as Promise<void>);
  return signed_xdr;
}

export async function rabetXdrSingXdrAndSubmit(xdr: string, pubKey: string) {
  // const network = "mainnet" // mainnet / testnet
  const signed_xdr = await rabetXdrSingXdr(xdr, pubKey);

  if (signed_xdr) {
    const res = await submitSignedXDRToServer(signed_xdr);
    return res.successful;
  }

  return false;
}

interface SignResult {
  xdr: string;
  error: string;
}
