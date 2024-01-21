import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

import axios from "axios";
import toast from "react-hot-toast";

import { WalletType } from "../../../lib/enums";
import { auth } from "../../../lib/firebase/firebase-auth";
import { type ConnectWalletStateModel } from "../../../state/connect_wallet_state";
import { addrShort } from "../../../lib/utils";
import { authResSchema, submitActiveAcountXdr } from "./utils";
import { USER_ACOUNT_URL } from "../constant";
import NextLogin from "./next-login";

export async function googleLogin(walletState: ConnectWalletStateModel) {
  const provider = new GoogleAuthProvider();
  provider.addScope("https://www.googleapis.com/auth/userinfo.email");

  try {
    const user = (await signInWithPopup(auth, provider)).user;
    const { uid } = user;
    const { email } = user.providerData[0]!;

    await auth.signOut();
    const res = await toast.promise(
      axios.get(USER_ACOUNT_URL, {
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

    await NextLogin(publicKey, publicKey);
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
