import { Networks } from "@stellar/stellar-sdk";

export const networkPassphrase =
  process.env.NEXT_PUBLIC_STELLAR_PUBNET === "true"
    ? Networks.PUBLIC
    : Networks.TESTNET;

export const STELLAR_URL =
  process.env.NEXT_PUBLIC_STELLAR_PUBNET === "true"
    ? "https://horizon.stellar.org"
    : "https://horizon-testnet.stellar.org";

export const ACTION_STELLAR_ACCOUNT_URL = "https://accounts.action-tokens.com/";

export const USER_ACOUNT_URL = ACTION_STELLAR_ACCOUNT_URL + "api/account";
export const USER_ACOUNT_XDR_URL =
  ACTION_STELLAR_ACCOUNT_URL + "api/account_xdr";
