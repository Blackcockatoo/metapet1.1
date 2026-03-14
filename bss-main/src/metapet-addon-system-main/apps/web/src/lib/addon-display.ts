const categoryLabels: Record<string, string> = {
  aura: "Aura",
  mask: "Mask",
  wings: "Wings",
  headwear: "Headwear",
  weapon: "Weapon",
  bodywear: "Bodywear",
  back_attachment: "Back Attachment",
  companion: "Companion"
};

const rarityLabels: Record<string, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  mythic: "Mythic"
};

export function formatAddonCategory(category: string): string {
  return categoryLabels[category] ?? category.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatAddonRarity(rarity: string): string {
  return rarityLabels[rarity] ?? rarity.replace(/\b\w/g, (character) => character.toUpperCase());
}
