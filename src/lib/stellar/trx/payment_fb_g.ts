import { Server, Transaction, xdr } from "stellar-sdk";
import { networkPassphrase } from "../constant";
import { STELLAR_URL } from "../constant";
import log from "~/lib/logger/logger";

export async function submitSignedXDRToServer4User(signed_xdr: string) {
  try {
    const envelop = xdr.TransactionEnvelope.fromXDR(signed_xdr, "base64");
    const transaction = new Transaction(envelop, networkPassphrase);
    const server = new Server(STELLAR_URL);
    return server
      .submitTransaction(transaction)
      .then(async (result) => {
        log.info("Transaction successful:", result);
        const successful = result.successful;
        return successful;
      })
      .catch((error) => {
        if (error.response) {
          console.error(
            "Transaction failed with Horizon response:",
            error.response.data,
          );
          console.error(error.response.data.extras);
          console.error(error.response.data.extras.result_codes.operations);
        } else {
          console.error("Transaction failed with an error:", error);
        }
        return false;
      });
  } catch (e) {
    log.info("other error,", e);
    return false;
  }
}
