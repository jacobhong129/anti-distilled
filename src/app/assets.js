import assetMap from "../data/asset-map.json";

export { assetMap };

export const DIMENSION_SYMBOLS = {
  CXT: "dimension-context",
  BND: "dimension-boundary",
  GEN: "dimension-reconstruct",
  TST: "dimension-aesthetic",
  STN: "dimension-value",
  GRD: "dimension-internalize",
};

export function publicAsset(path) {
  if (!path) return "";
  const base = import.meta.env.BASE_URL || "./";
  return `${base}${path.replace(/^\.\//, "")}`;
}

export function resultSmokePath(score) {
  if (score >= 75) return assetMap.smoke.scoreHigh;
  if (score >= 52) return assetMap.smoke.scoreMid;
  return assetMap.smoke.scoreLow;
}
