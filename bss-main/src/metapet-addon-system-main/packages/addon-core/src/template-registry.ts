import type { AddonTemplate, AddonTemplateRegistry } from "./types";
import {
  moss60AuraOfSentienceTemplate,
  moss60AuraTemplate,
  moss60ChronoShiftGogglesTemplate,
  moss60CrystalHeartHarnessTemplate,
  moss60DreamWeaverCircletTemplate,
  moss60EchoingVoidOrbTemplate,
  moss60EclipseDropsTemplate,
  moss60GravityWellGauntletTemplate,
  moss60LunarCircuitMarksTemplate,
  moss60MaskTemplate,
  moss60OracleRingTemplate,
  moss60PhoenixWingsTemplate,
  moss60PrismBeretTemplate,
  moss60PrismChimeFamiliarTemplate,
  moss60ResonanceAmplifierTemplate,
  moss60SeraphicPendantFieldTemplate,
  moss60SigilVeilTemplate,
  moss60SolarisCrownManeTemplate,
  moss60SovereignWingsTemplate,
  moss60SpectralTressesTemplate,
  moss60StarlightMantleTemplate,
  moss60VoidCrownTemplate
} from "./templates/moss60";

const templates = [
  moss60SovereignWingsTemplate,
  moss60MaskTemplate,
  moss60AuraTemplate,
  moss60PhoenixWingsTemplate,
  moss60AuraOfSentienceTemplate,
  moss60ChronoShiftGogglesTemplate,
  moss60GravityWellGauntletTemplate,
  moss60CrystalHeartHarnessTemplate,
  moss60StarlightMantleTemplate,
  moss60EchoingVoidOrbTemplate,
  moss60PrismChimeFamiliarTemplate,
  moss60ResonanceAmplifierTemplate,
  moss60DreamWeaverCircletTemplate,
  moss60SeraphicPendantFieldTemplate,
  moss60SpectralTressesTemplate,
  moss60SolarisCrownManeTemplate,
  moss60SigilVeilTemplate,
  moss60LunarCircuitMarksTemplate,
  moss60EclipseDropsTemplate,
  moss60OracleRingTemplate,
  moss60VoidCrownTemplate,
  moss60PrismBeretTemplate
] satisfies AddonTemplate[];

export const addonTemplateRegistry: AddonTemplateRegistry = {
  byId: Object.fromEntries(templates.map((template) => [template.id, template])),
  ids: templates.map((template) => template.id)
};

export function getAddonTemplate(templateId: string): AddonTemplate | undefined {
  return addonTemplateRegistry.byId[templateId];
}

export function listAddonTemplates(): AddonTemplate[] {
  return addonTemplateRegistry.ids
    .map((templateId) => addonTemplateRegistry.byId[templateId])
    .filter((template): template is AddonTemplate => Boolean(template));
}
