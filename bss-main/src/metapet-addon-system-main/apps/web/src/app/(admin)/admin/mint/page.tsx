import { listAddonTemplates } from "@bluesnake-studios/addon-core";
import { PageHeader } from "@bluesnake-studios/ui";

import { AdminOperationsConsole } from "@/components/admin/admin-operations-console";
import { SiteFrame } from "@/components/layout/site-frame";
import { isReceiverConsentRequired } from "@/lib/server/transfer-policy";

export default function AdminMintPage() {
  const templates = listAddonTemplates().map((template) => ({ id: template.id, name: template.name }));
  const receiverConsentRequired = isReceiverConsentRequired();

  return (
    <SiteFrame>
      <PageHeader
        eyebrow="Admin / Mint"
        title="Authenticated mint and transfer console"
        description="This page now drives the live `/api/mint` and `/api/transfer` handlers, including header-based admin auth and JSON request bodies."
      />
      <AdminOperationsConsole receiverConsentRequired={receiverConsentRequired} templateOptions={templates} />
    </SiteFrame>
  );
}
