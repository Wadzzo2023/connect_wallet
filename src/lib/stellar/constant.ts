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
export const USER_ACCOUNT_URL_APPLE = ACTION_STELLAR_ACCOUNT_URL + "api/apple_private";
export const USER_ACCOUNT_XDR_URL = ACTION_STELLAR_ACCOUNT_URL + "api/account_xdr";

export const PLATFORM_ASSET = new Asset(
  env.NEXT_PUBLIC_ASSET_CODE,
  env.NEXT_PUBLIC_ASSET_ISSUER,
);

export const TrxBaseFee = env.NEXT_PUBLIC_STAGE === "prod" ? "1000" : "100";

function calculatePlatformFees(stage: string, assetCode: string) {
  const isProd = stage === "prod";
  const code = assetCode.toLowerCase();

  if (!isProd) {
    return { trxBaseFee: "1", platformFee: "1" };
  }

  switch (code) {
    case "wadzzo":
      return { trxBaseFee: "10", platformFee: "25" };
    case "bandcoin":
      return { trxBaseFee: "1400", platformFee: "6000" };
    case "action":
      return { trxBaseFee: "20", platformFee: "35" };
    default:
      return { trxBaseFee: "1", platformFee: "1" }; // fallback
  }
}

// Use calculated values but keep exports unchanged
const { trxBaseFee, platformFee } = calculatePlatformFees(
  env.NEXT_PUBLIC_STAGE,
  PLATFORM_ASSET.code.toLocaleLowerCase(),
);

export const TrxBaseFeeInPlatformAsset = trxBaseFee;
export const PLATFORM_FEE = platformFee;

export const STROOP = "0.0000001";
export const TRUST_XLM = 0.6;
// Fee for transaction in bandcoin
// in xlm
export const PLATFORM_FEE_IN_XLM = 0.005;
export const trxBaseFeeInXLM = 0.005;

// simplified fee (trxBaseFee + platform fee)
export const SIMPLIFIED_FEE = 2050; // in bandcoin
export const SIMPLIFIED_FEE_IN_XLM = 0.01; // in xlm
