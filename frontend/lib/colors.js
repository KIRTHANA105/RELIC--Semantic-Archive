// First four are the brand palette; the rest extend it for k up to 8 clusters.
export const CLUSTER_COLORS = [
  "#B84A32", // terracotta
  "#777447", // olive bronze
  "#C59A45", // antique gold
  "#762E26", // oxide red
  "#3F6B66", // verdigris
  "#3B4A5E", // lapis ink
  "#9A6B4C", // clay
  "#6B5A2E", // dark ochre
];
export const clusterColor = (i) => CLUSTER_COLORS[i % CLUSTER_COLORS.length];
