import {
  Asset,
  Horizon,
  Keypair,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { MOTHER_SECRET } from "~/lib/stellar/marketplace/SECRET";
import { networkPassphrase, STELLAR_URL } from "../constant";

export async function GetDummyXDR({ pubkey }: { pubkey: string }) {
  const server = new Horizon.Server("https://horizon.stellar.org");

  const serverKeypair = Keypair.fromSecret(MOTHER_SECRET);

  const transactionInializer = await server.loadAccount(pubkey);

  const Tx1 = new TransactionBuilder(transactionInializer, {
    fee: "200",
    networkPassphrase: Networks.PUBLIC,
  })

    // sending platform fee.
    .addOperation(
      Operation.payment({
        amount: "0.000001",
        source: pubkey,
        asset: Asset.native(),
        destination: serverKeypair.publicKey(),
      }),
    )

    .setTimeout(0)
    .build();

  //   Tx1.sign(serverKeypair);

  return Tx1.toXDR();
}

export async function verifyXDRSignature({
  xdr,
  publicKey,
}: {
  xdr: string;
  publicKey: string;
}) {
  try {
    // Load the transaction from the XDR
    const transaction = new Transaction(xdr, Networks.PUBLIC);

    // Convert the public key to a Keypair
    const keypair = Keypair.fromPublicKey(publicKey);

    // Get the hash of the transaction
    const txHash = transaction.hash();

    // Check each signature to see if it matches the provided public key
    for (let signature of transaction.signatures) {
      if (keypair.verify(txHash, signature.signature())) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false;
  }
}
