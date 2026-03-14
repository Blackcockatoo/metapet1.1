import { PageHeader } from "@bluesnake-studios/ui";

import { InventoryClient } from "@/components/inventory/inventory-client";
import { SiteFrame } from "@/components/layout/site-frame";
import { isDirectWalletTransferEnabled, isReceiverConsentRequired } from "@/lib/server/transfer-policy";

export default function InventoryPage() {
  const receiverConsentRequired = isReceiverConsentRequired();
  const directWalletTransferEnabled = isDirectWalletTransferEnabled();

  return (
    <SiteFrame>
      <PageHeader
        eyebrow="Inventory"
        title="Your MOSS60 collection"
        description="Equip add-ons to your active loadout, preview them on Auralia, and transfer ownership to another wallet. All changes persist server-side and are audited."
      />
      <InventoryClient directWalletTransferEnabled={directWalletTransferEnabled} receiverConsentRequired={receiverConsentRequired} />
    </SiteFrame>
  );
}
