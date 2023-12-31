import { z } from "zod";
import { submitSignedXDRToServer4User } from "../trx/payment_fb_g";
import toast from "react-hot-toast";

export const extraSchema = z.object({
  isAccActive: z.boolean(),
  xdr: z.string().optional(),
});

export const authResSchema = z.object({
  publicKey: z.string().min(56),
  extra: extraSchema,
});

export async function submitActiveAcountXdr(
  extra: z.infer<typeof extraSchema>,
) {
  if (!extra.isAccActive) {
    if (extra.xdr) {
      const res = await toast.promise(submitSignedXDRToServer4User(extra.xdr), {
        loading: "Activating account...",
        success: "Request complited",
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
