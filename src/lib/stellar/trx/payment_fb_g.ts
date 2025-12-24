import { Networks, Transaction, xdr, Horizon } from "@stellar/stellar-sdk";

import { networkPassphrase } from "../constant";
import { STELLAR_URL } from "../constant";
import { formatErrorForLogging, parseStellarError, StellarTransactionError } from "../../error-handler";

export async function submitSignedXDRToServer4User(signed_xdr: string) {
  try {
    const envelop = xdr.TransactionEnvelope.fromXDR(signed_xdr, "base64");
    const transaction = new Transaction(envelop, networkPassphrase);
    const server = new Horizon.Server(STELLAR_URL);

    const result = await server.submitTransaction(transaction);

    return {
      success: true,
      message: "Transaction submitted successfully",
      hash: result.hash
    };
  } catch (error) {
    const parsedError = parseStellarError(error);
    console.error("Transaction Error:", formatErrorForLogging(error));
    throw new StellarTransactionError(parsedError);
  }
}

export async function submitSignedXDRToServer4UserTestnet(signed_xdr: string) {
  try {
    const envelop = xdr.TransactionEnvelope.fromXDR(signed_xdr, "base64");
    const transaction = new Transaction(envelop, Networks.TESTNET);
    const server = new Horizon.Server("https://horizon-testnet.stellar.org");

    const result = await server.submitTransaction(transaction);

    return {
      success: true,
      message: "Transaction submitted successfully",
      hash: result.hash
    };
  } catch (error) {

    const parsedError = parseStellarError(error);
    console.error("Transaction Error:", formatErrorForLogging(error));
    throw new StellarTransactionError(parsedError);
  }
}

export async function submitSignedXDRToServer4UserPubnet(signed_xdr: string) {
  try {
    const envelop = xdr.TransactionEnvelope.fromXDR(signed_xdr, "base64");
    const transaction = new Transaction(envelop, Networks.PUBLIC);
    const server = new Horizon.Server("https://horizon.stellar.org");

    const result = await server.submitTransaction(transaction);

    return {
      success: true,
      message: "Transaction submitted successfully",
      hash: result.hash
    };
  } catch (error) {
    const parsedError = parseStellarError(error);
    console.error("Transaction Error:", formatErrorForLogging(error));
    throw new StellarTransactionError(parsedError);
  }
}
