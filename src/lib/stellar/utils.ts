/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  xdr,
  Transaction,
  Networks,
  Server,
  type Horizon,
  type Memo,
  type MemoType,
  type Operation,
} from "stellar-sdk";
import { WalletType } from "../enums";
import {
  albedoSignTrx,
  albedoSignTrxInTestNet,
} from "./wallet_clients/albedo_login";
import { freighterSignTrx } from "./wallet_clients/freighter_login";
import { xbullXdrSingXdrAndSubmit } from "./wallet_clients/xbull_login";
import { rabetXdrSingXdrAndSubmit } from "./wallet_clients/rabe_login";
import {
  walletConnectSignTransaction,
  walletConnectSignTransactionSubmitterWrapper,
} from "./wallet_clients/wallet_connect";
import {
  submitSignedXDRToServer4User,
  submitSignedXDRToServer4UserTestnet,
} from "./trx/payment_fb_g";

import axios from "axios";
import { STELLAR_URL } from "./constant";

export const recursiveTransactionSubmitter = async (
  transaction: Transaction<Memo<MemoType>, Operation[]>,
): Promise<Horizon.SubmitTransactionResponse> => {
  let result: Horizon.SubmitTransactionResponse;
  try {
    const server = new Server("https://horizon.stellar.org");

    result = await server.submitTransaction(transaction);
    return result;
  } catch (error: any) {
    console.info(error);
    if (error.response) {
      console.info(error.response.data.extras);
      if (error.response.status === 504) {
        return recursiveTransactionSubmitter(transaction);
      } else if (error.response.status === 400) {
        console.info(error);
        throw "bad seq happened";
      }
    }

    throw "other error happens";
  }
};

export async function submitSignedXDRToServer(signed_xdr: string) {
  const envelop = xdr.TransactionEnvelope.fromXDR(signed_xdr, "base64");
  const transaction = new Transaction(envelop, Networks.PUBLIC);
  const res = await recursiveTransactionSubmitter(transaction);
  return res;
}

export async function clientsign(props: {
  walletType: WalletType;
  presignedxdr: string;
  pubkey: string;
  test?: boolean;
}) {
  if (props.test) {
    if (props.walletType == WalletType.isAdmin) {
      return await submitSignedXDRToServer4UserTestnet(props.presignedxdr);
    }
    return await albedoSignTrxInTestNet(props.presignedxdr, props.pubkey);
  }

  if (props.walletType == WalletType.isAdmin)
    return await submitSignedXDRToServer4User(props.presignedxdr);
  switch (props.walletType) {
    case WalletType.albedo:
      return await albedoSignTrx(props.presignedxdr, props.pubkey);
    case WalletType.frieghter:
      return await freighterSignTrx(props.presignedxdr, props.pubkey);
    case WalletType.xBull:
      return await xbullXdrSingXdrAndSubmit(props.presignedxdr, props.pubkey);
    case WalletType.rabet:
      return await rabetXdrSingXdrAndSubmit(props.presignedxdr, props.pubkey);
    case WalletType.walletConnect:
      return await walletConnectSignTransactionSubmitterWrapper(
        props.presignedxdr,
      );

    case WalletType.google:
      return await submitSignedXDRToServer4User(props.presignedxdr);
    case WalletType.facebook:
      return await submitSignedXDRToServer4User(props.presignedxdr);
    case WalletType.emailPass:
      return await submitSignedXDRToServer4User(props.presignedxdr);
    default:
      return false;
  }
}

export function concatAssetWithIssuer(
  asset_code: string,
  asset_issuer: string,
): string {
  return `${asset_code}-${asset_issuer}`;
}

export function getAssetIssuerFromConcat(
  concatenatedStr: string,
): [string, string] {
  const parts = concatenatedStr.split("-");
  if (parts.length === 2) {
    return [parts[0]!, parts[1]!];
  } else {
    throw new Error("Invalid format: The string does not contain a hyphen.");
  }
}

export async function checkStellarAccountActivity(
  publicKey: string,
): Promise<boolean> {
  try {
    const response = await axios.get(`${STELLAR_URL}/accounts/${publicKey}`);
    const accountData = response.data;

    // Check if the account exists and has a balance
    if (
      accountData &&
      accountData.id &&
      accountData.balances &&
      accountData.balances.length > 0
    ) {
      return true; // Active account
    }

    return false; // Inactive account
  } catch (error) {
    return false;
  }
}
