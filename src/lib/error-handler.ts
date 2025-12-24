import { Networks, Transaction, xdr, Horizon } from "@stellar/stellar-sdk";

// Error types and interfaces
export interface StellarErrorResponse {
    success: boolean;
    message: string;
    errorCode: string;
    details?: string;
    technicalDetails?: any;
}

// Transaction Result Codes mapping
const TRANSACTION_ERROR_MESSAGES: Record<string, string> = {
    tx_failed: "Transaction failed - one or more operations failed",
    tx_too_early: "Transaction submitted before its minimum time",
    tx_too_late: "Transaction submitted after its maximum time",
    tx_missing_operation: "Transaction has no operations",
    tx_bad_seq: "Transaction sequence number is invalid. Please refresh and try again",
    tx_bad_auth: "Transaction has invalid signatures or authorization",
    tx_insufficient_balance: "Insufficient balance to pay transaction fee",
    tx_no_source_account: "Source account not found on the network",
    tx_insufficient_fee: "Transaction fee is too low",
    tx_bad_auth_extra: "Transaction has unused signatures",
    tx_internal_error: "Internal Stellar network error occurred",
    tx_not_supported: "Transaction type not supported",
    tx_fee_bump_inner_failed: "Fee bump inner transaction failed",
    tx_bad_sponsorship: "Sponsorship-related error in transaction",
    tx_bad_min_seq_age_or_gap: "Invalid minimum sequence age or gap",
    tx_malformed: "Transaction is malformed or invalid"
};

// Operation Result Codes mapping
const OPERATION_ERROR_MESSAGES: Record<string, string> = {
    op_inner: "Operation failed - check operation-specific error",
    op_bad_auth: "Operation lacks required authorization",
    op_no_source_account: "Operation source account does not exist",
    op_not_supported: "Operation not supported by the network",
    op_too_many_subentries: "Account has too many subentries (trustlines, offers, signers)",
    op_exceeded_work_limit: "Operation exceeded computational work limit",
    op_too_many_sponsoring: "Account is sponsoring too many entries",

    // Payment specific
    payment_malformed: "Payment amount or destination is invalid",
    payment_underfunded: "Insufficient balance to complete payment",
    payment_src_not_authorized: "Source account not authorized for this asset",
    payment_no_destination: "Destination account does not exist",
    payment_no_trust: "Destination has no trustline for this asset",
    payment_not_authorized: "Destination not authorized to hold this asset",
    payment_line_full: "Destination trustline limit would be exceeded",
    payment_no_issuer: "Asset issuer account does not exist",

    // Path payment specific
    path_payment_strict_receive_malformed: "Path payment parameters are invalid",
    path_payment_strict_receive_underfunded: "Insufficient balance for path payment",
    path_payment_strict_receive_src_not_authorized: "Source not authorized for send asset",
    path_payment_strict_receive_no_destination: "Destination account does not exist",
    path_payment_strict_receive_no_trust: "Destination has no trustline for asset",
    path_payment_strict_receive_not_authorized: "Destination not authorized for asset",
    path_payment_strict_receive_line_full: "Destination trustline would exceed limit",
    path_payment_strict_receive_no_issuer: "Asset issuer does not exist",
    path_payment_strict_receive_too_few_offers: "Not enough offers to complete payment path",
    path_payment_strict_receive_offer_cross_self: "Payment path would cross own offer",
    path_payment_strict_receive_over_sendmax: "Path would exceed maximum send amount",

    // Account merge
    account_merge_malformed: "Invalid account merge operation",
    account_merge_no_account: "Destination account does not exist",
    account_merge_immutable_set: "Cannot merge account with AUTH_IMMUTABLE set",
    account_merge_has_sub_entries: "Cannot merge account with active trustlines or offers",
    account_merge_seqnum_too_far: "Source account sequence too far ahead",
    account_merge_dest_full: "Destination would exceed maximum balance",
    account_merge_is_sponsor: "Cannot merge account that is sponsoring entries",

    // Create account
    create_account_malformed: "Invalid create account parameters",
    create_account_underfunded: "Insufficient balance to create account",
    create_account_low_reserve: "Starting balance below minimum reserve",
    create_account_already_exist: "Destination account already exists",

    // Manage offer
    manage_sell_offer_malformed: "Invalid offer parameters",
    manage_sell_offer_sell_no_trust: "No trustline for selling asset",
    manage_sell_offer_buy_no_trust: "No trustline for buying asset",
    manage_sell_offer_sell_not_authorized: "Not authorized to sell this asset",
    manage_sell_offer_buy_not_authorized: "Not authorized to buy this asset",
    manage_sell_offer_line_full: "Trustline limit would be exceeded",
    manage_sell_offer_underfunded: "Insufficient balance to create offer",
    manage_sell_offer_cross_self: "Offer would cross own offer",
    manage_sell_offer_sell_no_issuer: "Selling asset issuer does not exist",
    manage_sell_offer_buy_no_issuer: "Buying asset issuer does not exist",
    manage_sell_offer_not_found: "Offer to update/delete not found",
    manage_sell_offer_low_reserve: "Insufficient balance for reserve requirement",

    // Change trust
    change_trust_malformed: "Invalid trustline parameters",
    change_trust_no_issuer: "Asset issuer account does not exist",
    change_trust_invalid_limit: "Trustline limit is invalid",
    change_trust_low_reserve: "Insufficient balance for reserve requirement",
    change_trust_self_not_allowed: "Cannot create trustline to self",
    change_trust_trust_line_missing: "Trustline does not exist",
    change_trust_cannot_delete: "Cannot delete trustline with balance",
    change_trust_not_auth_maintain_liabilities: "Not authorized to maintain liabilities",

    // Set options
    set_options_low_reserve: "Insufficient balance for new signer reserve",
    set_options_too_many_signers: "Account already has maximum signers",
    set_options_bad_flags: "Invalid combination of account flags",
    set_options_invalid_inflation: "Invalid inflation destination",
    set_options_cant_change: "Cannot change master key weight to 0 with other signers",
    set_options_unknown_flag: "Unknown or invalid flag specified",
    set_options_threshold_out_of_range: "Threshold value out of valid range",
    set_options_bad_signer: "Invalid signer key or weight",
    set_options_invalid_home_domain: "Invalid home domain format",

    // Allow trust
    allow_trust_malformed: "Invalid allow trust parameters",
    allow_trust_no_trust_line: "Trustline does not exist",
    allow_trust_trust_not_required: "Trustee account does not require trust",
    allow_trust_cant_revoke: "Cannot revoke authorization for this asset",
    allow_trust_self_not_allowed: "Cannot allow trust to self",
    allow_trust_low_reserve: "Insufficient balance for reserve",

    // Bump sequence
    bump_sequence_bad_seq: "New sequence number must be greater than current"
};

/**
 * Parses Stellar transaction error and returns user-friendly message
 */
export function parseStellarError(error: any): StellarErrorResponse {
    // Handle Horizon API errors
    if (error.response?.data) {
        const errorData = error.response.data;
        const extras = errorData.extras;

        // Transaction failed with result codes
        if (extras?.result_codes) {
            const { transaction, operations } = extras.result_codes;

            // Handle transaction-level errors
            if (transaction && transaction !== "tx_failed") {
                return {
                    success: false,
                    message: TRANSACTION_ERROR_MESSAGES[transaction] || "Transaction failed",
                    errorCode: transaction,
                    details: errorData.detail,
                    technicalDetails: extras
                };
            }

            // Handle operation-level errors
            if (operations && Array.isArray(operations)) {
                const failedOps = operations
                    .map((op, index) => ({ op, index }))
                    .filter(({ op }) => op !== "op_success");

                if (failedOps.length > 0) {
                    const firstError = failedOps[0];
                    const errorMessage = OPERATION_ERROR_MESSAGES[firstError.op] ||
                        `Operation ${firstError.index + 1} failed: ${firstError.op}`;

                    return {
                        success: false,
                        message: errorMessage,
                        errorCode: firstError.op,
                        details: `Operation ${firstError.index + 1} of ${operations.length} failed`,
                        technicalDetails: extras
                    };
                }
            }
        }

        // Handle other Horizon errors
        return {
            success: false,
            message: errorData.title || "Transaction submission failed",
            errorCode: errorData.type || "unknown_error",
            details: errorData.detail,
            technicalDetails: errorData
        };
    }

    // Handle network errors
    if (error.request) {
        return {
            success: false,
            message: "Network error - unable to reach Stellar network",
            errorCode: "network_error",
            details: "Please check your internet connection and try again"
        };
    }

    // Handle XDR parsing errors
    if (error.message?.includes("XDR")) {
        return {
            success: false,
            message: "Invalid transaction format",
            errorCode: "xdr_parse_error",
            details: "The transaction data is malformed or corrupted"
        };
    }

    // Handle timeout errors
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        return {
            success: false,
            message: "Request timed out",
            errorCode: "timeout_error",
            details: "The Stellar network is taking too long to respond. Please try again"
        };
    }

    // Generic error fallback
    return {
        success: false,
        message: "An unexpected error occurred",
        errorCode: "unknown_error",
        details: error.message || "Please try again or contact support",
        technicalDetails: error
    };
}

/**
 * Gets a user-friendly error message for display
 */
export function getUserFriendlyErrorMessage(error: any): string {
    const parsed = parseStellarError(error);

    let message = parsed.message;
    if (parsed.details) {
        message += `\n${parsed.details}`;
    }

    return message;
}

/**
 * Formats error for logging with technical details
 */
export function formatErrorForLogging(error: any): string {
    const parsed = parseStellarError(error);

    return JSON.stringify({
        errorCode: parsed.errorCode,
        message: parsed.message,
        details: parsed.details,
        timestamp: new Date().toISOString(),
        technicalDetails: parsed.technicalDetails
    }, null, 2);
}

/**
 * Checks if error is recoverable (user can retry)
 */
export function isRecoverableError(error: any): boolean {
    const parsed = parseStellarError(error);

    const recoverableErrors = [
        "tx_bad_seq",
        "tx_insufficient_fee",
        "timeout_error",
        "network_error",
        "tx_too_early",
        "tx_too_late"
    ];

    return recoverableErrors.includes(parsed.errorCode);
}

/**
 * Custom error class for Stellar transactions
 */
export class StellarTransactionError extends Error {
    public errorCode: string;
    public details?: string;
    public technicalDetails?: any;
    public isRecoverable: boolean;

    constructor(errorResponse: StellarErrorResponse) {
        super(errorResponse.message);
        this.name = "StellarTransactionError";
        this.errorCode = errorResponse.errorCode;
        this.details = errorResponse.details;
        this.technicalDetails = errorResponse.technicalDetails;
        this.isRecoverable = isRecoverableError(errorResponse as any);

        // Maintains proper stack trace for where error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, StellarTransactionError);
        }
    }

    /**
     * Get user-friendly error message
     */
    getUserMessage(): string {
        let message = this.message;
        if (this.details) {
            message += `\n${this.details}`;
        }
        return message;
    }

    /**
     * Get formatted error for logging
     */
    getLogMessage(): string {
        return JSON.stringify({
            errorCode: this.errorCode,
            message: this.message,
            details: this.details,
            timestamp: new Date().toISOString(),
            technicalDetails: this.technicalDetails
        }, null, 2);
    }
}
