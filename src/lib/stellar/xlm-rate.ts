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
 * zero strict-send paths either) before writing this. Callers must fall
 * back to a fixed estimate when this returns `null` — there is currently
 * no live price to derive a rate from for either asset.
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

// Flat, per-transaction XLM costs a purchase reimburses treasury for —
// not scaled by quantity, since buy_edition/buy_batch charge these once
// per call regardless of how many tokens it settles.
const TRANSACTION_FEE_XLM = 0.03;
const INCLUSION_FEE_XLM = 0.07;
// Per-token XLM cost of the ledger entry/TTL reserve each newly-minted
// copy needs ("wallet hold" fee) — this one DOES scale with quantity,
// unlike the two flat fees above.
const WALLET_HOLD_FEE_PER_TOKEN_XLM = 0.4;

/**
 * Computes inclusion_fee/network_fee in platform-asset units for a
 * purchase of `quantity` copies, using the live XLM rate when one's
 * available. Formula (in XLM, before conversion):
 *   inclusionFee = 0.07 + (0.4 * quantity)   — flat inclusion cost, plus
 *                                                each new token's own
 *                                                wallet-hold/TTL reserve
 *   networkFee   = 0.03                       — flat, real transaction fee
 *
 * Falls back to `fallbackInclusionFee`/`fallbackNetworkFee` (today's
 * fixed per-asset values, already computed elsewhere) when there's no
 * live rate yet — see `getXlmToAssetRate`'s doc comment for why that's
 * the current state for every asset this applies to right now.
 */
export async function computeLiveInclusionAndNetworkFee({
  asset,
  quantity,
  fallbackInclusionFee,
  fallbackNetworkFee,
}: {
  asset: Asset;
  quantity: number;
  fallbackInclusionFee: number;
  fallbackNetworkFee: number;
}): Promise<{ inclusionFee: number; networkFee: number }> {
  const rate = await getXlmToAssetRate(asset);
  if (rate === null) {
    return { inclusionFee: fallbackInclusionFee, networkFee: fallbackNetworkFee };
  }
  const inclusionFeeXlm = INCLUSION_FEE_XLM + WALLET_HOLD_FEE_PER_TOKEN_XLM * quantity;
  return {
    inclusionFee: inclusionFeeXlm * rate,
    networkFee: TRANSACTION_FEE_XLM * rate,
  };
}
