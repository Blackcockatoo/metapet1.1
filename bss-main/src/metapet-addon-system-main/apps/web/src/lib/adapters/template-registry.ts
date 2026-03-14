import { listAddonTemplates, type AddonTemplate } from "@bluesnake-studios/addon-core";

import { formatAddonCategory, formatAddonRarity } from "@/lib/addon-display";

export interface CatalogTemplateCard {
  id: string;
  name: string;
  category: string;
  rarity: string;
  previewText: string;
  editionText: string;
  fieldSummary: string;
}

function toEditionText(template: AddonTemplate): string {
  if (template.editionLimit.policy === "open") {
    return "Open edition";
  }

  return `${template.editionLimit.maxEditions ?? 0} max editions`;
}

export function toCatalogTemplateCard(template: AddonTemplate): CatalogTemplateCard {
  return {
    id: template.id,
    name: template.name,
    category: formatAddonCategory(template.category),
    rarity: formatAddonRarity(template.rarity),
    previewText: template.previewText,
    editionText: toEditionText(template),
    fieldSummary: template.metadataModel.fields.map((field) => field.label).join(", ")
  };
}

export function listCatalogTemplateCards(): CatalogTemplateCard[] {
  return listAddonTemplates().map(toCatalogTemplateCard);
}
