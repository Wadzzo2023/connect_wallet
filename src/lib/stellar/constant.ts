import { Asset, Networks } from "@stellar/stellar-sdk";
import { env } from "~/env";
import {
  applyFeeFormula,
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
 * Where to send an external-wallet buyer who is short on platform asset.
 * `null` on testnet — StellarTerm only indexes mainnet order books.
 */
export function stellarTermSwapUrl(): string | null {
  if (!env.NEXT_PUBLIC_STELLAR_PUBNET) return null;
  return `https://stellarterm.com/exchange/${PLATFORM_ASSET.code}-${PLATFORM_ASSET.issuer}/XLM-native`;
}


function calculatePlatformFees(stage: string, assetCode: string) {
  const isProd = stage === "prod";
  const code = assetCode.toLowerCase();

  // Classic-Stellar fees only. The NFT contract's inclusion/network fee is
  // separate — see `getInclusionAndNetworkFee`.
  // Dev uses production's figures so pricing bugs show up before release.
  if (!isProd) {
    switch (code) {
      case "bandcoin": return { trxBaseFee: "1400", platformFee: "6000" };
      case "action": return { trxBaseFee: "20", platformFee: "35" };
      default: return { trxBaseFee: "1", platformFee: "1" };
    }

  }


  switch (code) {
    case "wadzzo":
      return { trxBaseFee: "10", platformFee: "25", };
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

// Inclusion fee (stroops) bid for Soroban invokes, on top of the simulated
// resource fee. The SDK default of 100 expires unconfirmed on mainnet.
export const SOROBAN_INCLUSION_FEE = env.NEXT_PUBLIC_STELLAR_PUBNET ? "1000000" : "100";

// -----------------------------------------------------------------------------
// Fee-bump reimbursement — what a buyer pays treasury for fronting the real
// network cost of their purchase (see `contracts/nft_oz`'s
// `buy_edition`/`buy`/`buy_batch`). Nothing here is a classic-Stellar fee.
// -----------------------------------------------------------------------------

/**
 * Fixed inclusion/network fees, in platform-asset units.
 *
 * Used by bandcoin/action on testnet (stellar.expert has no price for a
 * testnet issuer) and by wadzzo always (never live-priced). bandcoin/action
 * on pubnet are priced live and never reach this.
 */
function fixedInclusionAndNetworkFee(code: string) {
  switch (code) {
    case "bandcoin":
      return { inclusionFee: "49823", networkFee: "3180" };
    case "action":
      return { inclusionFee: "100", networkFee: "50" };
    case "wadzzo":
      return { inclusionFee: "10", networkFee: "5" };
    default:
      return { inclusionFee: "1", networkFee: "1" };
  }
}

const { inclusionFee, networkFee } = fixedInclusionAndNetworkFee(
  PLATFORM_ASSET.code.toLocaleLowerCase(),
);

// Reimburses treasury for the network cost it fronts via fee-bump. Human
// units, not stroops — convert with `humanPriceToRaw`.
//
// NOT what pubnet charges for bandcoin/action; that is priced live. Use
// `getInclusionAndNetworkFee` unless you specifically want the fixed table.
export const INCLUSION_FEE_IN_PLATFORM_ASSET = Number(inclusionFee);
export const NETWORK_FEE_IN_PLATFORM_ASSET = Number(networkFee);

/**
 * The fixed fee table, scaled for a given purchase the same way the live path
 * scales the live rate.
 *
 * The constants are calibrated for one baseline: one copy into an already-
 * active account. Returning them raw undercharged every other case — a
 * 10-copy purchase reimbursed one copy's reserves. So scale them by the ratio
 * `applyFeeFormula` gives between this purchase and that baseline, which keeps
 * them in step with the live path.
 */
function scaledFixedFee(
  quantity: number,
  accountActive: boolean,
): { inclusionFee: number; networkFee: number } {
  // `unitsPerXlm: 1` → raw XLM amounts, so these are pure ratios.
  const baseline = applyFeeFormula(1, 1, true);
  const thisPurchase = applyFeeFormula(1, quantity, accountActive);
  return {
    inclusionFee:
      INCLUSION_FEE_IN_PLATFORM_ASSET * (thisPurchase.inclusionFee / baseline.inclusionFee),
    networkFee: NETWORK_FEE_IN_PLATFORM_ASSET * (thisPurchase.networkFee / baseline.networkFee),
  };
}

export async function getInclusionAndNetworkFee(
  quantity: number,
  /** Whether the buyer's Stellar account is already active and already
   *  holds the platform asset's trustline. Defaults to `true` since every
   *  existing call site already gates on `isStellarAccountActivated`
   *  upstream (see `ensureBuyerReady`) before ever reaching a fee
   *  computation — pass `false` explicitly only from a flow that bundles
   *  activation into the same purchase. */
  accountActive = true,
): Promise<{ inclusionFee: number; networkFee: number }> {
  const code = PLATFORM_ASSET.code.toLocaleLowerCase();
  if (code !== "bandcoin" && code !== "action") {
    // Fixed pricing is this asset's actual model (wadzzo), not a fallback.
    return scaledFixedFee(quantity, accountActive);
  }
  try {
    return await computeLiveInclusionAndNetworkFee({
      asset: PLATFORM_ASSET,
      quantity,
      accountActive,
    });
  } catch (e) {
    // Testnet has no live rate at all, so the fixed table is its real pricing.
    if (!env.NEXT_PUBLIC_STELLAR_PUBNET) {
      return scaledFixedFee(quantity, accountActive);
    }
    // Pubnet fails closed, like `getInclusionAndNetworkFeeInUsd`. A frozen
    // number drifts, and custodial buyers never see the fee their server
    // signs for — a silent overcharge is worse than a blocked checkout.
    throw e;
  }
}

/**
 * USD counterpart to `getInclusionAndNetworkFee` above — see
 * `computeLiveInclusionAndNetworkFeeInUsd`'s doc comment. Throws if
 * Binance is unreachable and there's no cached rate — does not fall back
 * to `INCLUSION_FEE_IN_USD`/`NETWORK_FEE_IN_USD` (defined further down
 * this file; kept only for the unrelated flat Square-fee display that
 * doesn't go through this live path). Applies to every asset (not gated
 * to bandcoin/action) since USD/USDC pricing doesn't depend on which
 * platform asset a given app uses.
 */
export async function getInclusionAndNetworkFeeInUsd(
  quantity: number,
  accountActive = true,
): Promise<{ inclusionFee: number; networkFee: number }> {
  return computeLiveInclusionAndNetworkFeeInUsd({ quantity, accountActive });
}

/**
 * What an inactive buyer is charged for having their account and trustline
 * created — the "2.5 XLM (Account active fee + Platform token trust fee)" line
 * in the fee plan.
 *
 * Stellar's own minimum for an account holding one trustline is 1.5 XLM
 * ((2 base reserves + 1 entry) x 0.5). The extra covers the transaction costs
 * of the setup itself and leaves the buyer a small starting balance, so
 * treasury is not left short on every new account.
 *
 * Real XLM cost of silently activating a custodial card buyer's account
 * and establishing its Platform Asset trustline in one step — see
 * `ensureBuyerActivatedAndTrustedForCardPurchase` in
 * `~/lib/stellar/marketplace/trx/site-asset-recharge.ts`, which spends
 * exactly this much treasury XLM. This is Stellar's own minimum reserve
 * for an account holding one trustline, not a padded estimate: (2 base
 * reserves + 1 entry) * 0.5 XLM.
 */
export const ACCOUNT_ACTIVATION_COST_XLM = 2.5;

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

// Added to a card/USD Square charge. The platform-asset path recovers this
// on-chain instead via the contract's `inclusion_fee`/`network_fee`; a USD
// purchase can't, since treasury funds that leg itself.
export const INCLUSION_FEE_IN_USD = 0.05;
export const NETWORK_FEE_IN_USD = 0.1;

// Contract ids in `~/lib/common` are blank until deployed for that network.
// Fail loudly rather than send an invoke to an empty id.
export function requireContractConstant(value: string, name: string): string {
  if (!value) {
    throw new Error(`${name} is not set — deploy the contract for this network first.`);
  }
  return value;
}

// Mirrors nft_oz's on-chain caps so the UI can reject bad input early — keep
// both in step. The royalty ceiling isn't policy: it's the largest value
// keeping `seller_amount` non-negative at the 10% platform-fee ceiling.
export const MAX_PLATFORM_FEE_BPS = 1_000; // 10%
export const MAX_ROYALTY_BPS = 9_000; // 90%
// Display/validation default only. Real purchases are charged whatever the
// contract stores — changing this does nothing until `set_platform_fee` runs
// against the live contract.
export const DEFAULT_PLATFORM_FEE_BPS = 100; // 1%

// Contract prices are i128 raw units; Stellar assets use 7 decimals. Single
// conversion point between those and the human prices shown in the UI.
export const PAYMENT_TOKEN_DECIMALS = 7;
export const PAYMENT_TOKEN_SCALE = 10_000_000; // 10 ** PAYMENT_TOKEN_DECIMALS

export function humanPriceToRaw(price: number): bigint {
  return BigInt(Math.round(price * PAYMENT_TOKEN_SCALE));
}

export function rawPriceToHuman(raw: bigint | number): number {
  return Number(raw) / PAYMENT_TOKEN_SCALE;
}
