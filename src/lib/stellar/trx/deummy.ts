import {
  Asset,
  Horizon,
  Keypair,
  Operation,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { networkPassphrase, STELLAR_URL } from "../constant";
import { env } from "~/env";

export async function GetDummyXDR({ pubkey }: { pubkey: string }) {
  const server = new Horizon.Server(STELLAR_URL);
  const serverKeypair = Keypair.fromSecret(env.MOTHER_SECRET);
  const transactionInializer = await server.loadAccount(pubkey);

  const Tx1 = new TransactionBuilder(transactionInializer, {
    fee: "200",
    networkPassphrase: networkPassphrase,
  })
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
    console.log("Verifying signature for XDR:", xdr, "with public key:", publicKey);
    // Load the transaction from the XDR
    const transaction = new Transaction(xdr, networkPassphrase);

    // Convert the public key to a Keypair
    const keypair = Keypair.fromPublicKey(publicKey);
    // Get the hash of the transaction
    const txHash = transaction.hash();

    // Check each signature to see if it matches the provided public key
    for (const signature of transaction.signatures) {
      console.log("Checking signature:", signature.signature().toString("hex"));
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
