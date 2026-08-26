import axios from "axios";
import { type Asset } from "@stellar/stellar-sdk";

/**
 * Live USD price for a classic asset, from stellar.expert. Always queries
 * the `public` network — testnet has no real market, and this 404s for a
 * testnet issuer.
 *
 * Not Horizon's DEX order book: bandcoin and action both have empty ones.
 * Throws rather than guessing; callers decide what to do.
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
    // Reuse a stale rate rather than fail over a transient lookup.
    return cached?.rate ?? null;
  }
}

// Per-token ledger entry/TTL reserve ("wallet hold"). Scales with quantity,
// and is the same whether or not the buyer's account needed activating.
const WALLET_HOLD_FEE_PER_TOKEN_XLM = 0.4;

// Flat per-transaction XLM costs. The inactive-account numbers are higher
// because that transaction also bundles create-account and change-trust.
const ACTIVE_ACCOUNT_FEES_XLM = {
  transactionFee: 0.03,
  inclusionFee: 0.07,
  // No separate activation cost — the account and trustline already exist.
  activationFee: 0,
};
const INACTIVE_ACCOUNT_FEES_XLM = {
  transactionFee: 0.04,
  inclusionFee: 0.09,
  // One-time: account minimum reserve plus the trustline. Not per-token.
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
// USD / USDC — 1 USDC = 1 USD, so "XLM per USDC" is XLM's USD price.
//
// From stellar.expert, not Binance: Binance blocks this app's production
// hosting IPs, so it works in dev and 500s on mainnet.
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
