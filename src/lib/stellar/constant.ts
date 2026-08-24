import { Asset, Networks } from "@stellar/stellar-sdk";
import { env } from "~/env";

// =============================================================================
// Classic Stellar (Horizon, classic assets, legacy platform-asset fee tables)
// =============================================================================

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

export function stellarExpertUrl(code: string, issuer: string | null | undefined): string {
  const network = env.NEXT_PUBLIC_STELLAR_PUBNET ? "public" : "testnet";
  if (!issuer || code === "XLM") {
    return `https://stellar.expert/explorer/${network}/asset/XLM`;
  }
  return `https://stellar.expert/explorer/${network}/asset/${code}-${issuer}`;
}

function calculatePlatformFees(stage: string, assetCode: string) {
  const isProd = stage === "prod";
  const code = assetCode.toLowerCase();

  if (!isProd) {
    return { trxBaseFee: "1", platformFee: "1", inclusionFee: "1", networkFee: "1" };
  }

  switch (code) {
    case "wadzzo":
      return { trxBaseFee: "10", platformFee: "25", inclusionFee: "10", networkFee: "5" };
    case "bandcoin":
      return { trxBaseFee: "1400", platformFee: "6000", inclusionFee: "1000", networkFee: "500" };
    case "action":
      return { trxBaseFee: "20", platformFee: "35", inclusionFee: "100", networkFee: "50" };
    default:
      return { trxBaseFee: "1", platformFee: "1", inclusionFee: "1", networkFee: "1" }; // fallback
  }
}

// Use calculated values but keep exports unchanged
const { trxBaseFee, platformFee, inclusionFee, networkFee } = calculatePlatformFees(
  env.NEXT_PUBLIC_STAGE,
  PLATFORM_ASSET.code.toLocaleLowerCase(),
);

export const TrxBaseFeeInPlatformAsset = trxBaseFee;
export const PLATFORM_FEE = platformFee;

// Flat, fixed-rate reimbursement for the real Stellar/Soroban network cost
// treasury fronts on a buyer's behalf — see `contracts/nft_oz`'s
// `admin_buy_edition_for`/`admin_buy_for` and the nft_oz payment design.
// Human-readable platform-asset units (not raw/stroop units) — convert with
// `humanPriceToRaw` at the call site, same as any other on-chain price.
// Fixed by design, not derived from a live exchange rate: same reasoning as
// `PLATFORM_FEE`/`TrxBaseFeeInPlatformAsset` above.
export const INCLUSION_FEE_IN_PLATFORM_ASSET = Number(inclusionFee);
export const NETWORK_FEE_IN_PLATFORM_ASSET = Number(networkFee);

export const STROOP = "0.0000001";
export const TRUST_XLM = 0.6;
// Fee for transaction in bandcoin
// in xlm
export const PLATFORM_FEE_IN_XLM = 0.005;
export const trxBaseFeeInXLM = 0.005;

// simplified fee (trxBaseFee + platform fee)
export const SIMPLIFIED_FEE = 2050; // in bandcoin
export const SIMPLIFIED_FEE_IN_XLM = 0.01; // in xlm

// =============================================================================
// Smart contracts (Soroban) — nft_oz / ft_oz / bounty escrow
// =============================================================================

// Soroban RPC endpoint used to simulate + assemble contract-invocation
// transactions (bounty escrow, nft_oz/ft_oz mint/list/buy, admin TTL bumps).
// Submission of the signed envelope still goes through Horizon (STELLAR_URL)
// via the existing clientsign flow.
export const SOROBAN_RPC_URL = env.NEXT_PUBLIC_STELLAR_PUBNET
  ? "https://mainnet.sorobanrpc.com"
  : "https://soroban-testnet.stellar.org";

// Inclusion fee (stroops) bid for Soroban contract-invoke transactions. The
// SDK's bare default (100 stroops) isn't competitive enough to get picked up
// for inclusion under current mainnet congestion — verified empirically that
// transactions sit unconfirmed and expire at that default, while 1,000,000
// stroops gets included. This is added on top of the simulated resource fee,
// not a replacement for it.
export const SOROBAN_INCLUSION_FEE = env.NEXT_PUBLIC_STELLAR_PUBNET ? "1000000" : "100";

// Added to the Square charge on a card/USD checkout, on top of the item's
// own (creator/reseller-set) USD sticker price — this is the one place a
// flat fee surcharge can actually be collected for a card purchase without
// leaking: a Square charge is a single number that lands directly in the
// platform's account, never split by the contract the way an on-chain total
// would be. The Platform-Asset checkout path instead recovers this
// atomically on-chain via the contract's own `inclusion_fee`/`network_fee`
// (see `contracts/nft_oz`'s `admin_buy_edition_for`/`admin_buy_for`), which
// a USD purchase can't use since treasury is the one funding that leg in
// the first place — Square already collected the equivalent in USD.
export const INCLUSION_FEE_IN_USD = 0.05;
export const NETWORK_FEE_IN_USD = 0.05;

// Some contract addresses in `~/lib/common` are only known once
// `pnpm contracts:deploy` has run for a given network (pubnet starts blank).
// Call sites that build a contract-invoke XDR need a hard failure rather than
// silently sending to an empty contract id.
export function requireContractConstant(value: string, name: string): string {
  if (!value) {
    throw new Error(`${name} is not set — deploy the contract for this network first.`);
  }
  return value;
}

// nft_oz/ft_oz enforce these same caps on-chain (see MAX_PLATFORM_FEE_BPS /
// MAX_ROYALTY_BPS in both contracts) — mirrored here so the UI/API can reject
// out-of-range input before ever building a doomed transaction.
export const MAX_PLATFORM_FEE_BPS = 1_000; // 10%
export const MAX_ROYALTY_BPS = 5_000; // 50%
// Target fee going forward (250 -> 350). This is a *display/validation*
// default only — the actual fee enforced on-chain is whatever's stored in
// the shared art collection contract's own state (set via `set_platform_fee`
// / the `admin.platformFee` mutation). Bumping this constant does NOT by
// itself change what real purchases are charged; someone with admin access
// still needs to run that mutation once against the live (shared with
// bandfan) contract before this value and reality agree.
export const DEFAULT_PLATFORM_FEE_BPS = 100; // 1% // 3.5%

// The contracts' `price`/`total_price` fields are i128 amounts in the payment
// token's raw (stroop-like) units. Stellar assets use 7 decimal places by
// convention, so this is the single conversion point between that and the
// human-readable price shown/entered in the UI.
export const PAYMENT_TOKEN_DECIMALS = 7;
export const PAYMENT_TOKEN_SCALE = 10_000_000; // 10 ** PAYMENT_TOKEN_DECIMALS

export function humanPriceToRaw(price: number): bigint {
  return BigInt(Math.round(price * PAYMENT_TOKEN_SCALE));
}

export function rawPriceToHuman(raw: bigint | number): number {
  return Number(raw) / PAYMENT_TOKEN_SCALE;
}
