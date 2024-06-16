import { z } from "zod";
import { submitSignedXDRToServer4User } from "../trx/payment_fb_g";
import toast from "react-hot-toast";

import { extraSchema } from "./type";

export async function submitActiveAcountXdr(
  extra: z.infer<typeof extraSchema>,
) {
  if (!extra.isAccActive) {
    if (extra.xdr) {
      const res = await toast.promise(submitSignedXDRToServer4User(extra.xdr), {
        loading: "Activating account...",
        success: "Submitted to stellar",
        error: "While activating account error happened, Try again later",
      });

      if (res) {
        toast.success("Account activated");
      } else {
        toast.error("Account activation failed");
      }
    }
  }
}
