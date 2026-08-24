import axios from "axios";
import { Asset, Horizon } from "@stellar/stellar-sdk";
import { STELLAR_URL } from "./constant";

/**
 * Live XLM -> platform-asset conversion rate, sourced from the classic
 * Stellar DEX order book (best ask: the cheapest existing offer to sell
 * the platform asset for XLM). Cached in memory and only re-queried once
 * `REFRESH_INTERVAL_MS` has elapsed since the last successful fetch —
 * refreshed lazily on next use, not via a background timer (a setInterval
 * doesn't survive a serverless/Next.js server restart anyway, so "refresh
 * on next access past the interval" is the more honest cadence).
 *
 * Returns `null` (not a thrown error) when the order book has no asks —
 * true right now for both Bandcoin and Action, on both pubnet and
 * testnet: verified directly against Horizon (empty order books, and
 * zero strict-send paths either) before writing this. `null` at this
 * layer just means "no rate yet, ask again later" — it's this file's own
 * callers (`computeLiveInclusionAndNetworkFee`) that decide what to do
 * about it, currently by throwing rather than guessing a fixed number.
 */

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const cache = new Map<string, { rate: number; fetchedAt: number }>();

function cacheKey(asset: Asset): string {
  return `${asset.getCode()}:${asset.getIssuer()}`;
}

async function fetchXlmToAssetRate(asset: Asset): Promise<number | null> {
  const server = new Horizon.Server(STELLAR_URL);
  const orderBook = await server.orderbook(Asset.native(), asset).call();
  const bestAsk = orderBook.asks[0];
  if (!bestAsk) return null;
  // Horizon's ask `price` is "how many units of the selling asset (XLM)
  // it costs to buy 1 unit of the buying asset (the platform asset)" —
  // the inverse of what we want (platform-asset units per 1 XLM).
  const xlmPerAsset = Number(bestAsk.price);
  if (!Number.isFinite(xlmPerAsset) || xlmPerAsset <= 0) return null;
  return 1 / xlmPerAsset;
}

/**
 * Platform-asset units per 1 XLM, right now. `null` if there's no live
 * order-book price to derive it from (see this file's doc comment) — the
 * caller's own fixed fallback is the only sane behavior in that case, not
 * a thrown error, since "no liquidity yet" is an expected, ordinary state
 * for a newly-listed asset, not a bug.
 */
export async function getXlmToAssetRate(asset: Asset): Promise<number | null> {
  const key = cacheKey(asset);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < REFRESH_INTERVAL_MS) {
    return cached.rate;
  }
  try {
    const rate = await fetchXlmToAssetRate(asset);
    if (rate === null) return cached?.rate ?? null;
    cache.set(key, { rate, fetchedAt: Date.now() });
    return rate;
  } catch {
    // Horizon hiccup — reuse a stale cached rate rather than fail the
    // whole fee computation over a transient network error.
    return cached?.rate ?? null;
  }
}

// Per-token XLM cost of the ledger entry/TTL reserve each newly-minted
// copy needs ("wallet hold" fee) — scales with quantity, same for both
// account states below (creating N token ledger entries costs the same
// whether or not the buyer's own account needed activating first).
const WALLET_HOLD_FEE_PER_TOKEN_XLM = 0.4;

// Flat, per-transaction XLM costs, split by whether the buyer's Stellar
// account is already active (has a funded account + the platform asset's
// trustline) or needs both established as part of this same purchase.
// The inactive-account numbers are higher because that one transaction
// bundles more operations (create-account + change-trust + the purchase
// itself), which costs more real network fee to include.
const ACTIVE_ACCOUNT_FEES_XLM = {
  transactionFee: 0.03,
  inclusionFee: 0.07,
  // No separate activation cost — the account and trustline already exist.
  activationFee: 0,
};
const INACTIVE_ACCOUNT_FEES_XLM = {
  transactionFee: 0.04,
  inclusionFee: 0.09,
  // Flat, one-time: creating the account (network's minimum reserve) plus
  // establishing the platform asset's trustline — not scaled by quantity,
  // same as the transaction/inclusion fees above.
  activationFee: 2.5,
};

/**
 * The formula shared by every currency this fee gets converted into. See
 * `ACTIVE_ACCOUNT_FEES_XLM`/`INACTIVE_ACCOUNT_FEES_XLM` for the constants
 * `accountActive` selects between.
 *   inclusionFee = (flat inclusion cost + activation, if inactive)
 *                  + (0.4 * quantity)   — each new token's own
 *                                          wallet-hold/TTL reserve
 *   networkFee   = flat transaction fee for this account state
 * `unitsPerXlm` is however many units of the target currency 1 XLM buys
 * right now (platform-asset units, or USD/USDC dollars).
 */
function applyFeeFormula(
  unitsPerXlm: number,
  quantity: number,
  accountActive: boolean,
): { inclusionFee: number; networkFee: number } {
  const fees = accountActive ? ACTIVE_ACCOUNT_FEES_XLM : INACTIVE_ACCOUNT_FEES_XLM;
  const inclusionFeeXlm =
    fees.inclusionFee + fees.activationFee + WALLET_HOLD_FEE_PER_TOKEN_XLM * quantity;
  return {
    inclusionFee: inclusionFeeXlm * unitsPerXlm,
    networkFee: fees.transactionFee * unitsPerXlm,
  };
}

/**
 * Computes inclusion_fee/network_fee in platform-asset units for a
 * purchase of `quantity` copies, using the live XLM rate (see
 * `applyFeeFormula` for the formula itself).
 *
 * Throws — does not fall back to a fixed guess — when there's no live rate
 * yet; see `getXlmToAssetRate`'s doc comment for why that's the current
 * state for every asset this applies to right now. Callers must handle
 * that failure explicitly (surface it, retry, block the purchase) rather
 * than silently charging a stale or made-up fee.
 */
export async function computeLiveInclusionAndNetworkFee({
  asset,
  quantity,
  accountActive,
}: {
  asset: Asset;
  quantity: number;
  /** Whether the buyer's Stellar account already exists and already holds
   *  the platform asset's trustline. `false` bundles the one-time account-
   *  creation + trustline cost into `inclusionFee` (see
   *  `INACTIVE_ACCOUNT_FEES_XLM`). */
  accountActive: boolean;
}): Promise<{ inclusionFee: number; networkFee: number }> {
  const rate = await getXlmToAssetRate(asset);
  if (rate === null) {
    throw new Error(
      `No live DEX rate available for ${asset.getCode()} — cannot compute a live inclusion/network fee right now.`,
    );
  }
  return applyFeeFormula(rate, quantity, accountActive);
}

// =============================================================================
// USD / USDC — 1 USDC = 1 USD by definition, so "XLM units per USDC" is the
// same number as "XLM price in USD". Sourced from stellar.expert's XLM
// asset endpoint, matching the existing `getXLMPrice` in
// `src/lib/stellar/fan/get_token_price.ts` — NOT Binance: Binance blocks
// API access from this app's production hosting IP range (confirmed by a
// live 500 on `getInclusionAndNetworkFeeInUsdPreview` on mainnet, while the
// exact same request succeeds from an unrelated network), so a CEX ticker
// that reads fine in development is not actually reliable in production
// here. stellar.expert is already proven working from prod via that same
// app-level function. This file doesn't import that app-level function
// directly (this is the shared submodule; app code depends on it, not the
// other way around) — it re-implements the same call against the same
// public endpoint. Always queries the `public` (mainnet) network regardless
// of which network this app is otherwise pointed at, same as
// `getXLMPrice` — testnet has no real XLM market to price against.
// =============================================================================

const USD_REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 5 minutes
let usdRateCache: { rate: number; fetchedAt: number } | null = null;

async function fetchXlmUsdPrice(): Promise<number> {
  const response = await axios.get<{ price: number }>(
    "https://api.stellar.expert/explorer/public/asset/XLM",
  );
  const price = response.data.price;
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`stellar.expert returned an unusable XLM price: ${response.data.price}`);
  }
  return price;
}

/**
 * USD (== USDC) units per 1 XLM, right now. Cached the same way
 * `getXlmToAssetRate` is. Returns `null` only if stellar.expert is
 * unreachable AND there's no cached value yet to fall back on — in steady
 * state this essentially always succeeds, unlike the DEX-based
 * platform-asset rate.
 */
export async function getXlmToUsdRate(): Promise<number | null> {
  if (usdRateCache && Date.now() - usdRateCache.fetchedAt < USD_REFRESH_INTERVAL_MS) {
    return usdRateCache.rate;
  }
  try {
    const rate = await fetchXlmUsdPrice();
    usdRateCache = { rate, fetchedAt: Date.now() };
    return rate;
  } catch {
    return usdRateCache?.rate ?? null;
  }
}

/**
 * USD counterpart to `computeLiveInclusionAndNetworkFee` — same formula,
 * priced via the live stellar.expert XLM/USD rate instead of a Stellar DEX
 * order book. Applies universally (not gated by platform-asset code the
 * way the platform-asset version is) since USD/USDC pricing has nothing to
 * do with which platform asset a given app uses.
 *
 * Throws — does not fall back to a fixed guess — if stellar.expert is
 * unreachable and there's no cached rate to reuse yet (see
 * `getXlmToUsdRate`).
 */
export async function computeLiveInclusionAndNetworkFeeInUsd({
  quantity,
  accountActive,
}: {
  quantity: number;
  accountActive: boolean;
}): Promise<{ inclusionFee: number; networkFee: number }> {
  const rate = await getXlmToUsdRate();
  if (rate === null) {
    throw new Error("No live XLM/USD rate available — cannot compute a live inclusion/network fee right now.");
  }
  return applyFeeFormula(rate, quantity, accountActive);
}
