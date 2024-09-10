import { Asset, Networks } from "@stellar/stellar-sdk";
import { env } from "~/env";

export const networkPassphrase = env.NEXT_PUBLIC_STELLAR_PUBNET
  ? Networks.PUBLIC
  : Networks.TESTNET;

export const STELLAR_URL = env.NEXT_PUBLIC_STELLAR_PUBNET
  ? "https://horizon.stellar.org"
  : "https://horizon-testnet.stellar.org";

export const ACTION_STELLAR_ACCOUNT_URL = "https://accounts.action-tokens.com/";

export const USER_ACCOUNT_URL = ACTION_STELLAR_ACCOUNT_URL + "api/account";
export const USER_ACCOUNT_XDR_URL =
  ACTION_STELLAR_ACCOUNT_URL + "api/account_xdr";

export const TrxBaseFee = "1000";
export const TrxBaseFeeInPlatformAsset = "1400";
export const PLATFORM_FEE = "3000"; // in platform asset

export const PLATFORM_ASSET = new Asset(
  env.NEXT_PUBLIC_ASSET_CODE,
  env.NEXT_PUBLIC_ASSET_ISSUER,
);

export const STROOP = "0.0000001";
