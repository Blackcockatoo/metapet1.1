import { featureFlags, parseServerEnv } from "@bluesnake-studios/config";

export function isReceiverConsentRequired(): boolean {
  const env = parseServerEnv(process.env);
  return env.TRANSFER_REQUIRE_RECEIVER_CONSENT === "true";
}

export function isDirectWalletTransferEnabled(): boolean {
  const env = parseServerEnv(process.env);
  return featureFlags.directWalletTransfers && env.WALLET_DIRECT_TRANSFER_ENABLED === "true";
}
