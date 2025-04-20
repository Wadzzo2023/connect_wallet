import { z } from "zod";
export const extraSchema = z.object({
  isAccActive: z.boolean(),
  xdr: z.string().optional(),
});

export const getPublicKeyAPISchema = z.object({
  publicKey: z.string().min(56),
  extra: extraSchema,
});
