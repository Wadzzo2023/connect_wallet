import axios from "axios";
import toast from "react-hot-toast";

import { z } from "zod";
import { env } from "~/env.mjs";
import { WalletType } from "package/connect_wallet/src/lib/enums";
import { auth } from "~/lib/firebase/firebase-auth";
import { type ConnectWalletStateModel } from "package/connect_wallet/src/state/connect_wallet_state";
import { addrShort } from "~/lib/utils";
import { authResSchema, submitActiveAcountXdr } from "./utils";

export async function emailPassLogin(walletState: ConnectWalletStateModel) {
  const user = auth.currentUser;

  if (user) {
    const { uid, email } = user;
    try {
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
