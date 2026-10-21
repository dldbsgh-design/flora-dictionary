// Registry of dictionary parts. A new part = one entry here + one JSON file.
export const PARTS = {
  flowers: {
    label: "꽃",
    data: "data/flowers.json",
    tabs: [["가나다", "chosung"], ["색", "colors"], ["계절", "seasons"]],
    tagKeys: ["colors", "seasons", "moods"],
  },
  scents: {
    label: "향",
    data: "data/scents.json",
    tabs: [["가나다", "chosung"], ["계열", "family"], ["노트", "notes"]],
    tagKeys: ["family", "notes", "moods"],
  },
};
