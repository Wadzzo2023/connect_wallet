import axios from "axios";
import toast from "react-hot-toast";
import { WalletType } from "../../../lib/enums";
import { auth } from "../../../lib/firebase/firebase-auth";
import { type ConnectWalletStateModel } from "../../../state/connect_wallet_state";
import { addrShort } from "../../../lib/utils";
import { authResSchema, submitActiveAcountXdr } from "./utils";
import { USER_ACOUNT_URL } from "../constant";
import NextLogin from "./next-login";

export async function emailPassLogin(walletState: ConnectWalletStateModel) {
  const user = auth.currentUser;

  if (user) {
    const { uid, email } = user;

    try {
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
        WalletType.emailPass,
        uid,
        email ?? undefined,
      );
      toast.success("Public Key : " + addrShort(publicKey, 10));
    } catch (error) {
      console.error(error);
    }
  } else {
    toast.error("User is not logged In");
  }
}
