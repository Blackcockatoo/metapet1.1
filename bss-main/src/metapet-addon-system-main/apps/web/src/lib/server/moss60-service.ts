import { parseAddon } from "@bluesnake-studios/addon-core";
import { parseServerEnv } from "@bluesnake-studios/config";
import { createMoss60VerifiablePayload, createShareUrl } from "@bluesnake-studios/moss60";
import { z } from "zod";


const shareRequestSchema = z.object({
  addon: z.unknown(),
  baseUrl: z.string().url().optional()
});

export async function createShareUrlFromRequest(body: unknown) {
  const payload = shareRequestSchema.parse(body);
  const env = parseServerEnv(process.env);
  const addon = parseAddon(payload.addon);
  const verifiablePayload = await createMoss60VerifiablePayload(addon);
  const baseUrl = payload.baseUrl ?? env.MOSS60_SHARE_BASE_URL ?? "https://share.example.bluesnake.studio";

  return {
    status: 200,
    body: {
      shareUrl: createShareUrl(baseUrl, verifiablePayload),
      payload: verifiablePayload
    }
  };
}
