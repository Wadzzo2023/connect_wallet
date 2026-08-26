import axios from "axios";
import { type Asset } from "@stellar/stellar-sdk";

/**
 * Live USD price for a Stellar classic asset, via stellar.expert's asset
 * endpoint — used for both the platform asset and XLM itself. Always hits
 * the `public` (mainnet) network regardless of which network this app is
 * otherwise pointed at, matching the app's own `getXLMPrice`/`getAssetPrice`
 * (`src/lib/stellar/fan/get_token_price.ts`) — testnet has no real market
 * to price against, and Bandcoin/Action are mainnet-only assets anyway.
 *
 * This replaces an earlier version of this file that queried Horizon's
 * classic DEX order book directly: Bandcoin and Action both have an empty
 * order book on Horizon right now (verified directly, zero live asks/bids)
 * so that approach always returned `null` in practice. stellar.expert still
 * reports a real, non-zero `price` for both — derived from trade history,
 * not live order-book depth — confirmed directly against
 * `api.stellar.expert/explorer/public/asset/BANDCOIN-<issuer>` before
 * switching. Throws (never returns a fixed guess) if the asset isn't found
 * there or the endpoint is unreachable — callers decide what to do about
 * that.
 */
async function fetchStellarExpertPrice(assetPathSegment: string): Promise<number> {
  const response = await axios.get<{ price: number }>(
    `https://api.stellar.expert/explorer/public/asset/${assetPathSegment}`,
  );
  const price = response.data.price;
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(
      `stellar.expert returned an unusable price for ${assetPathSegment}: ${response.data.price}`,
    );
  }
  return price;
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const assetRateCache = new Map<string, { rate: number; fetchedAt: number }>();

function cacheKey(asset: Asset): string {
  return `${asset.getCode()}:${asset.getIssuer()}`;
}

/**
 * Platform-asset units per 1 XLM, right now — `(XLM's USD price) /
 * (platform asset's USD price)`, both from stellar.expert (see
 * `fetchStellarExpertPrice`'s doc comment for why not a DEX order book).
 * Cached in memory and only re-queried once `REFRESH_INTERVAL_MS` has
 * elapsed since the last successful fetch — refreshed lazily on next use,
 * not via a background timer (a setInterval doesn't survive a
 * serverless/Next.js server restart anyway, so "refresh on next access
 * past the interval" is the more honest cadence).
 *
 * `null` if either lookup fails (asset not listed there, or the endpoint
 * is unreachable) and there's no cached rate to reuse yet — this file's own
 * callers (`computeLiveInclusionAndNetworkFee`) decide what to do about
 * that, currently by throwing rather than guessing a fixed number.
 */
export async function getXlmToAssetRate(asset: Asset): Promise<number | null> {
  const key = cacheKey(asset);
  const cached = assetRateCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < REFRESH_INTERVAL_MS) {
    return cached.rate;
  }
  try {
    const [xlmUsd, assetUsd] = await Promise.all([
      fetchStellarExpertPrice("XLM"),
      fetchStellarExpertPrice(`${asset.getCode()}-${asset.getIssuer()}`),
    ]);
    const rate = xlmUsd / assetUsd;
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error(`Computed a non-finite rate for ${asset.getCode()}: ${rate}`);
    }
    // A rate that has moved by more than an order of magnitude since the last
    // good one is treated as bad data, not as a real market move. The fee this
    // feeds is `XLM amount * rate`, charged to a buyer whose server signs for
    // them without a human seeing the number, so a mispriced endpoint response
    // — wrong units, a stale zero, one asset briefly delisted — would go
    // straight through. Real moves of this size do not happen between two
    // five-minute polls; a broken response does. The stale cached rate is the
    // safer answer, and it is what the `catch` below already falls back to.
    if (cached && (rate > cached.rate * 10 || rate < cached.rate / 10)) {
      throw new Error(
        `Rejecting implausible ${asset.getCode()} rate ${rate} (cached ${cached.rate})`,
      );
    }
    assetRateCache.set(key, { rate, fetchedAt: Date.now() });
    return rate;
  } catch {
    // stellar.expert hiccup, or the asset genuinely isn't listed there —
    // reuse a stale cached rate rather than fail the whole fee computation
    // over a transient or missing lookup.
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
 *
 * Exported so the *fixed* fee table's fallback path can scale by the same
 * ratios this produces (see `getInclusionAndNetworkFee` in ./constant.ts) —
 * passing `unitsPerXlm: 1` yields the raw XLM amounts, which is all that
 * fallback needs to work out how a given quantity/account state compares to
 * the one-copy active-account baseline the fixed table is calibrated for.
 */
export function applyFeeFormula(
  unitsPerXlm: number,
  quantity: number,
  accountActive: boolean,
): { inclusionFee: number; networkFee: number } {
  const fees = accountActive ? ACTIVE_ACCOUNT_FEES_XLM : INACTIVE_ACCOUNT_FEES_XLM;
  const inclusionFeeXlm =
    fees.inclusionFee + fees.activationFee + WALLET_HOLD_FEE_PER_TOKEN_XLM * quantity;
  const networkFeeXlm = fees.transactionFee;

  assertWithinFormulaCeiling(inclusionFeeXlm, networkFeeXlm, quantity);

  return {
    inclusionFee: inclusionFeeXlm * unitsPerXlm,
    networkFee: networkFeeXlm * unitsPerXlm,
  };
}

/**
 * The worst case this formula can legitimately produce, in XLM: an inactive
 * account buying the contract's per-call maximum of 20 copies —
 * `0.09 + 2.5 + (0.4 * 20) + 0.04` ≈ 10.63. Rounded up to a deliberately
 * loose ceiling, because its job is to bound a bug's blast radius rather than
 * to price anything.
 *
 * Hardcoded rather than derived from the constants above, and that is the
 * whole point: a ceiling computed from the same numbers it is checking would
 * move with them and catch nothing. This is the one bound that does not
 * depend on either the fee constants or the live exchange rate, so it still
 * holds when one of those is what went wrong.
 *
 * The fee is ultimately `XLM amount * live rate`, and a wrong fee can come
 * from either side. This guards the formula half; `getXlmToAssetRate` guards
 * the rate half. Neither can cover for the other.
 */
const MAX_FORMULA_OUTPUT_XLM = 15;

function assertWithinFormulaCeiling(
  inclusionFeeXlm: number,
  networkFeeXlm: number,
  quantity: number,
): void {
  const total = inclusionFeeXlm + networkFeeXlm;
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error(
      `Fee formula produced a non-finite or non-positive total (${total}) for quantity ${quantity}`,
    );
  }
  if (total > MAX_FORMULA_OUTPUT_XLM) {
    throw new Error(
      `Fee formula produced ${total} XLM for quantity ${quantity}, above the ` +
        `${MAX_FORMULA_OUTPUT_XLM} XLM ceiling — refusing to price a purchase from it`,
    );
  }
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
      `No live price available for ${asset.getCode()} — cannot compute a live inclusion/network fee right now.`,
    );
  }
  return applyFeeFormula(rate, quantity, accountActive);
}

// =============================================================================
// USD / USDC — 1 USDC = 1 USD by definition, so "XLM units per USDC" is the
// same number as "XLM price in USD". Sourced from stellar.expert's XLM
// asset endpoint (`fetchStellarExpertPrice` above), matching the existing
// `getXLMPrice` in `src/lib/stellar/fan/get_token_price.ts` — NOT Binance:
// Binance blocks API access from this app's production hosting IP range
// (confirmed by a live 500 on `getInclusionAndNetworkFeeInUsdPreview` on
// mainnet, while the exact same request succeeds from an unrelated
// network), so a CEX ticker that reads fine in development is not actually
// reliable in production here. This file doesn't import the app-level
// function directly (this is the shared submodule; app code depends on it,
// not the other way around) — it re-implements the same call against the
// same public endpoint.
// =============================================================================

const USD_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let usdRateCache: { rate: number; fetchedAt: number } | null = null;

/**
 * USD (== USDC) units per 1 XLM, right now. Cached the same way
 * `getXlmToAssetRate` is. Returns `null` only if stellar.expert is
 * unreachable AND there's no cached value yet to fall back on — in steady
 * state this essentially always succeeds, unlike the platform-asset rate
 * (thin liquidity/listing risk for a newer asset, not a concern for XLM
 * itself).
 */
export async function getXlmToUsdRate(): Promise<number | null> {
  if (usdRateCache && Date.now() - usdRateCache.fetchedAt < USD_REFRESH_INTERVAL_MS) {
    return usdRateCache.rate;
  }
  try {
    const rate = await fetchStellarExpertPrice("XLM");
    usdRateCache = { rate, fetchedAt: Date.now() };
    return rate;
  } catch {
    return usdRateCache?.rate ?? null;
  }
}

/**
 * USD counterpart to `computeLiveInclusionAndNetworkFee` — same formula,
 * priced via the live stellar.expert XLM/USD rate instead of the
 * platform-asset rate. Applies universally (not gated by platform-asset
 * code the way the platform-asset version is) since USD/USDC pricing has
 * nothing to do with which platform asset a given app uses.
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
