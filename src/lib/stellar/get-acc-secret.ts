import axios from "axios";
import { z } from "zod";

export async function getAccSecret(uid: string, email: string) {
  const res = await axios.get(
    "https://accounts.action-tokens.com/api/getAccSecret",
    {
      params: {
        uid,
        email,
      },
    },
  );
  const secretKeySchema = z.object({
    secretKey: z.string().min(56),
  });

  const { secretKey } = await secretKeySchema.parseAsync(res.data);
  return secretKey;
}
