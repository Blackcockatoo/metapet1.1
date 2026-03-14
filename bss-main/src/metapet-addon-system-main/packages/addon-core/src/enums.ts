export const addonCategories = ["aura", "mask", "wings", "headwear", "weapon", "bodywear", "back_attachment", "companion", "hair", "tattoo", "jewelry"] as const;

export type AddonCategory = (typeof addonCategories)[number];

export const addonRarities = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;

export type AddonRarity = (typeof addonRarities)[number];
