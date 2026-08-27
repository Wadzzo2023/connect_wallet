import axios from "axios";
import { z } from "zod";
import { env } from "~/env";

export async function getAccSecretFromRubyApi(email: string) {
  const res = await axios.get(
    `https://accounts.action-tokens.com/api/ruby_acc?email=${email}&uid=${env.RUBY_ACCOUNTS_SECRET}`,
  );
  const secretKeySchema = z.object({
    secretKey: z.string().min(56),
  });

  const { secretKey } = await secretKeySchema.parseAsync(res.data);
  return secretKey;
}
