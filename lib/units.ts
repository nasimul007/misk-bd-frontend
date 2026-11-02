// What a product's options are measured in. A product has one unit and a list of options ("6ml", "50g",
// "Pack of 10", "1 piece"). The unit drives the admin shortcuts and the shop's unit tabs; the option label
// itself is free text, so the admin can always type something else.
export type Unit = {
  id: string;
  name: string; // admin dropdown
  tab: string; // shop filter tab
  measured: boolean; // sizes you choose between (ml, g) versus counts of things (pieces, packs)
  presets: number[]; // quick-add amounts in the admin
  label: (n: number) => string;
};

export const UNITS: Unit[] = [
  { id: "ml", name: "Millilitres (ml)", tab: "ml", measured: true, presets: [1, 3, 6, 12], label: (n) => `${n}ml` },
  { id: "g", name: "Grams (g)", tab: "grams", measured: true, presets: [10, 25, 50, 100], label: (n) => `${n}g` },
  { id: "kg", name: "Kilograms (kg)", tab: "kg", measured: true, presets: [1, 2, 5], label: (n) => `${n}kg` },
  { id: "piece", name: "Pieces", tab: "pieces", measured: false, presets: [1, 2, 3], label: (n) => (n === 1 ? "1 piece" : `${n} pieces`) },
  { id: "pack", name: "Packs", tab: "packs", measured: false, presets: [10, 20, 40], label: (n) => `Pack of ${n}` },
  { id: "set", name: "Sets", tab: "sets", measured: false, presets: [2, 3, 5], label: (n) => `Set of ${n}` },
  { id: "box", name: "Boxes", tab: "boxes", measured: false, presets: [6, 12, 24], label: (n) => `Box of ${n}` },
];

export const UNIT_IDS = UNITS.map((u) => u.id);
export const unitOf = (id: string): Unit => UNITS.find((u) => u.id === id) ?? UNITS[0];
