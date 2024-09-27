import { Asset, Networks } from "@stellar/stellar-sdk";
import { env } from "~/env";

export const networkPassphrase = Networks.PUBLIC


export const STELLAR_URL = "https://horizon.stellar.org"


export const ACTION_STELLAR_ACCOUNT_URL = "https://accounts.action-tokens.com/";

export const USER_ACCOUNT_URL = ACTION_STELLAR_ACCOUNT_URL + "api/account";
export const USER_ACCOUNT_XDR_URL =
  ACTION_STELLAR_ACCOUNT_URL + "api/account_xdr";


export const PLATFORM_ASSET = new Asset(
  env.NEXT_PUBLIC_ASSET_CODE,
  env.NEXT_PUBLIC_ASSET_ISSUER,
);

export const TrxBaseFee = env.NEXT_PUBLIC_STAGE === 'prod' ? "1000" : "100"; // 100
export const TrxBaseFeeInPlatformAsset = env.NEXT_PUBLIC_STAGE === 'prod' ? (PLATFORM_ASSET.code.toLowerCase() === "wadzzo" ? "10" : "1400") : "1"
export const PLATFORM_FEE = env.NEXT_PUBLIC_STAGE === 'prod' ? (PLATFORM_ASSET.code.toLowerCase() === "wadzzo" ? "25" : "6000") : "1"


export const STROOP = "0.0000001";
