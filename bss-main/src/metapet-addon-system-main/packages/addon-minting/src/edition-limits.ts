import type { AddonTemplate } from "@bluesnake-studios/addon-core";

export function isEditionWithinLimit(template: AddonTemplate, edition: number): boolean {
  if (template.editionLimit.policy === "open") {
    return edition > 0;
  }

  return edition > 0 && edition <= (template.editionLimit.maxEditions ?? 0);
}

export function assertEditionWithinLimit(template: AddonTemplate, edition: number): void {
  if (!isEditionWithinLimit(template, edition)) {
    throw new Error(`Edition ${edition} exceeds template policy for ${template.id}.`);
  }
}
