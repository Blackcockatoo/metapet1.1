export type QuestInteraction =
  | "open_node"
  | "run_lasso"
  | "sonify_compare"
  | "save_scenario"
  | "brew_potion"
  | "enter_arena"
  | "win_arena_round";

export type QuestObjective = {
  id: string;
  description: string;
  requiredInteraction: QuestInteraction;
  minCount?: number;
  adaptiveHint?: string;
};

export type QuestChapter = {
  id: string;
  title: string;
  objectives: QuestObjective[];
  educationalCards: Array<{ id: string; title: string; body: string }>;
  rewards: string[];
  optionalMode: true;
  recommendedFor: "novice" | "all";
};

export const genomeQuestChapters: QuestChapter[] = [
  {
    id: "behavior-basics",
    title: "Behavior Resonance",
    optionalMode: true,
    recommendedFor: "all",
    objectives: [
      {
        id: "obj-open-node",
        description: "Inspect a behavior trait node in the constellation.",
        requiredInteraction: "open_node",
        minCount: 1,
        adaptiveHint: "Open any highlighted node to reveal allele context.",
      },
      {
        id: "obj-run-lasso",
        description: "Run lasso enrichment for a trait cluster.",
        requiredInteraction: "run_lasso",
        minCount: 1,
        adaptiveHint: "Use lasso around 3+ linked nodes for better enrichment confidence.",
      },
      {
        id: "obj-compare-sonification",
        description: "Compare two sonification profiles for contrast.",
        requiredInteraction: "sonify_compare",
        minCount: 1,
        adaptiveHint: "Try compare mode on two nearby clusters to hear epistasis patterns.",
      },
      {
        id: "obj-save-scenario",
        description: "Save one exploratory scenario with your findings.",
        requiredInteraction: "save_scenario",
        minCount: 1,
        adaptiveHint: "Saving a scenario unlocks later chapter shortcuts.",
      },
    ],
    educationalCards: [
      {
        id: "card-epistasis",
        title: "Hidden Interactions",
        body: "Some traits depend on gene partnerships, not single markers.",
      },
    ],
    rewards: ["badge:cluster-scout"],
  },
  {
    id: "alchemist-challenge",
    title: "Alchemist's Trial",
    optionalMode: true,
    recommendedFor: "all",
    objectives: [
      {
        id: "obj-brew-potion",
        description: "Brew a Stimulant or Catalyst potion in the Alchemist Lab.",
        requiredInteraction: "brew_potion",
        minCount: 1,
        adaptiveHint: "Raise multiple trait sliders above baseline to create a Stimulant. Push one very high to trigger a Catalyst.",
      },
      {
        id: "obj-brew-balancer",
        description: "Brew a Balancer potion with a synergy score above 50%.",
        requiredInteraction: "brew_potion",
        minCount: 1,
        adaptiveHint: "Adjust sliders so that opposing traits cancel out — the potion classifies as Balancer when net effect is near zero.",
      },
      {
        id: "obj-enter-arena",
        description: "Enter the Resonance Arena with at least 2 pet signatures.",
        requiredInteraction: "enter_arena",
        minCount: 1,
        adaptiveHint: "Add a second pet to the Arena panel to activate battle mode.",
      },
      {
        id: "obj-win-arena-round",
        description: "Win at least one trait category in Arena divergence mode.",
        requiredInteraction: "win_arena_round",
        minCount: 1,
        adaptiveHint: "Switch the Arena to Divergence mode — the pet with the highest raw trait value wins that category.",
      },
    ],
    educationalCards: [
      {
        id: "card-potion-types",
        title: "Potion Classification",
        body: "Stimulants raise net trait expression. Inhibitors suppress it. Catalysts cause divergence — great for the Arena. Balancers stabilize without large net shifts.",
      },
      {
        id: "card-arena-modes",
        title: "Arena Overlay Modes",
        body: "Similarity rewards pets whose traits mirror the group mean. Complementarity rewards unique high-value traits. Divergence is a straight head-to-head on raw values.",
      },
    ],
    rewards: ["badge:alchemist-brewer", "badge:arena-challenger"],
  },
];
