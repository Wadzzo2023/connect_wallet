import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

import axios from "axios";
import toast from "react-hot-toast";

import { WalletType } from "package/connect_wallet/src/lib/enums";
import { auth } from "~/lib/firebase/firebase-auth";
import { type ConnectWalletStateModel } from "package/connect_wallet/src/state/connect_wallet_state";
import { addrShort } from "~/lib/utils";
import { env } from "~/env.mjs";
import { authResSchema, submitActiveAcountXdr } from "./utils";

export async function googleLogin(walletState: ConnectWalletStateModel) {
  const provider = new GoogleAuthProvider();
  provider.addScope("https://www.googleapis.com/auth/userinfo.email");

  try {
    const user = (await signInWithPopup(auth, provider)).user;
    const { uid } = user;
    const { email } = user.providerData[0]!;

    await auth.signOut();
    const res = await toast.promise(
      axios.get(env.NEXT_PUBLIC_STELLAR_ACCOUNT_URL, {
        params: {
          uid,
          email,
        },
      }),
      {
        loading: "Getting public key...",
        success: "Received public key",
        error: "Unable to get public key",
      },
    );

    const { publicKey, extra } = await authResSchema.parseAsync(res.data);

    await submitActiveAcountXdr(extra);

    walletState.setUserData(
      publicKey,
      true,
      WalletType.google,
      uid,
      email ?? undefined,
    );
    toast.success("Public Key : " + addrShort(publicKey, 10));
  } catch (error) {
    console.error(error);
  }
}
