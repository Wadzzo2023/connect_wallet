import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

import axios from "axios";
import toast from "react-hot-toast";

import { ProviderNextLogin } from "~/utils/next-login";
import { WalletType } from "../../../lib/enums";
import { auth } from "../../../lib/firebase/firebase-auth";
import { USER_ACOUNT_URL } from "../constant";
import { getPublicKeyAPISchema } from "./type";
import { submitActiveAcountXdr } from "./utils";

export async function googleLogin() {
  const provider = new GoogleAuthProvider();
  provider.addScope("https://www.googleapis.com/auth/userinfo.email");

  try {
    const user = (await signInWithPopup(auth, provider)).user;
    const { email } = user.providerData[0]!;
    // const email = user.email;
    if (email) {
      const idToken = await user.getIdToken();

      const loginRes = await toast.promise(
        ProviderNextLogin({
          email,
          token: idToken,
          walletType: WalletType.google,
        }),
        { error: "Login error", loading: "Please Wait", success: null },
      );

      if (loginRes?.error) toast.error(loginRes.error);

      console.log(loginRes);

      // await auth.signOut();
      if (loginRes?.ok) {
        if (loginRes?.ok) toast.success("Login Successfull");
        const res = await toast.promise(
          axios.get(USER_ACOUNT_URL, {
            params: {
              uid: user.uid,
              email,
            },
          }),
          {
            loading: "Getting public key...",
            success: "Received public key",
            error: "Unable to get public key",
          },
        );

        const { publicKey, extra } = await getPublicKeyAPISchema.parseAsync(
          res.data,
        );

        await submitActiveAcountXdr(extra);
      }
    } else {
      toast.error("Email dont exist");
    }

    // await NextLogin(publicKey, publicKey);
    // toast.success("Public Key : " + addrShort(publicKey, 10));
  } catch (error) {
    console.error(error);
    // toast.error(error.message)
  }
}
