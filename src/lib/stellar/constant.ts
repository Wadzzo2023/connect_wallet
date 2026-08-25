import { Asset, Networks } from "@stellar/stellar-sdk";
import { env } from "~/env";
import {
  computeLiveInclusionAndNetworkFee,
  computeLiveInclusionAndNetworkFeeInUsd,
  getXlmToUsdRate,
} from "./xlm-rate";

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

/**
 * StellarTerm's DEX trading UI for the platform asset against XLM — the
 * wallet-agnostic "go get some" destination for a buyer whose *external*
 * wallet doesn't hold enough of it (see `InsufficientAssetBalance`).
 * Unlike an in-app top-up, this works for any external wallet, not a
 * custodial one specifically — it's a link to a public trading page any
 * wallet can connect to and trade from, not an in-app custodial purchase.
 *
 * `null` on testnet: StellarTerm only ever indexes mainnet order books, so
 * there's no working link to offer there.
 */
export function stellarTermSwapUrl(): string | null {
  if (!env.NEXT_PUBLIC_STELLAR_PUBNET) return null;
  return `https://stellarterm.com/exchange/${PLATFORM_ASSET.code}-${PLATFORM_ASSET.issuer}/XLM-native`;
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

/**
 * Safety margin applied on top of the live per-item price floor wherever a
 * creator/reseller *sets* a price (not at purchase time, where the exact
 * live number should still be used) — see `getInclusionAndNetworkFee`'s doc
 * comment for what that floor is and why it moves. The floor is a live
 * number tied to the current XLM/platform-asset rate, not a fixed constant:
 * an item priced exactly at today's floor can fall back under tomorrow's
 * floor purely from ordinary rate movement between listing and purchase,
 * with nothing about the item or the code having changed. Padding the
 * *listing-time* floor by this much absorbs normal day-to-day drift so a
 * price that was fine when set doesn't silently become unbuyable later.
 */
export const LISTING_PRICE_FLOOR_MARGIN = 1.5;

/**
 * Live-priced counterpart to `INCLUSION_FEE_IN_PLATFORM_ASSET`/
 * `NETWORK_FEE_IN_PLATFORM_ASSET` above — for bandcoin and action only
 * (wadzzo keeps the purely fixed values by design; its own
 * `calculatePlatformFees` entry was never meant to be live-priced, so that
 * branch below isn't a fallback, it's a different asset's actual pricing
 * model). Computes `0.4 XLM * quantity + 0.03 XLM + 0.07 XLM`
 * (wallet-hold/TTL reserve per token, plus the flat transaction and
 * inclusion costs) converted through a live Stellar DEX rate — see
 * `computeLiveInclusionAndNetworkFee` and `getXlmToAssetRate`'s doc
 * comments for the mechanism and the on-chain order-book source.
 *
 * Falls back to `INCLUSION_FEE_IN_PLATFORM_ASSET`/
 * `NETWORK_FEE_IN_PLATFORM_ASSET` — the same production fee table used
 * everywhere else in this file, not a placeholder — when there's no live
 * rate yet (no live-tradeable liquidity currently exists for either asset
 * against XLM, on either network — verified directly against Horizon).
 * `computeLiveInclusionAndNetworkFee` itself still throws rather than
 * guess; this is the one call site that catches that and substitutes a
 * real, already-calibrated number instead of blocking checkout entirely.
 */
export async function getInclusionAndNetworkFee(
  quantity: number,
  /** Whether the buyer's Stellar account is already active and already
   *  holds the platform asset's trustline. Defaults to `true` since every
   *  existing call site already gates on account-activation upstream
   *  before ever reaching a fee computation — pass `false` explicitly
   *  only from a flow that bundles activation into the same purchase. */
  accountActive = true,
): Promise<{ inclusionFee: number; networkFee: number }> {
  const code = PLATFORM_ASSET.code.toLocaleLowerCase();
  if (code !== "bandcoin" && code !== "action") {
    return {
      inclusionFee: INCLUSION_FEE_IN_PLATFORM_ASSET,
      networkFee: NETWORK_FEE_IN_PLATFORM_ASSET,
    };
  }
  try {
    return await computeLiveInclusionAndNetworkFee({
      asset: PLATFORM_ASSET,
      quantity,
      accountActive,
    });
  } catch {
    return {
      inclusionFee: INCLUSION_FEE_IN_PLATFORM_ASSET,
      networkFee: NETWORK_FEE_IN_PLATFORM_ASSET,
    };
  }
}

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

/**
 * USD counterpart to `getInclusionAndNetworkFee` above — see
 * `computeLiveInclusionAndNetworkFeeInUsd`'s doc comment. Throws if
 * Binance is unreachable and there's no cached rate — does not fall back
 * to `INCLUSION_FEE_IN_USD`/`NETWORK_FEE_IN_USD` above (kept only for the
 * unrelated flat Square-fee display that doesn't go through this live
 * path). Applies to every asset (not gated to bandcoin/action) since
 * USD/USDC pricing doesn't depend on which platform asset a given app
 * uses.
 */
export async function getInclusionAndNetworkFeeInUsd(
  quantity: number,
  accountActive = true,
): Promise<{ inclusionFee: number; networkFee: number }> {
  return computeLiveInclusionAndNetworkFeeInUsd({ quantity, accountActive });
}

/**
 * Real XLM cost of silently activating a custodial card buyer's account
 * and establishing its Platform Asset trustline in one step — see
 * `ensureBuyerActivatedAndTrustedForCardPurchase` in
 * `~/lib/stellar/oz/nft.ts`, which spends exactly this much treasury XLM.
 * This is Stellar's own minimum reserve for an account holding one
 * trustline, not a padded estimate: (2 base reserves + 1 entry) * 0.5 XLM.
 */
export const ACCOUNT_ACTIVATION_COST_XLM = 1.5;

/**
 * USD-equivalent of `ACCOUNT_ACTIVATION_COST_XLM` right now, via the live
 * Binance XLM/USD rate (same source as `getInclusionAndNetworkFeeInUsd`).
 * A card/USD purchase that also has to activate the buyer's account adds
 * this on top of the total, so treasury is reimbursed for the real XLM it
 * fronts rather than eating the cost. Throws — no fixed fallback — if the
 * live rate is unavailable, same reasoning as
 * `computeLiveInclusionAndNetworkFeeInUsd`.
 */
export async function getAccountActivationCostInUsd(): Promise<number> {
  const rate = await getXlmToUsdRate();
  if (rate === null) {
    throw new Error("No live XLM/USD rate available — cannot price account activation right now.");
  }
  return ACCOUNT_ACTIVATION_COST_XLM * rate;
}

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
