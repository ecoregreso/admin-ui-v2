export function formatCents(value) {
  const amount = Number(value || 0) / 100;
  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatPercent(value) {
  if (value == null || Number.isNaN(value)) return "n/a";
  return `${(Number(value) * 100).toFixed(1)}%`;
}

export function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

export function maskId(value) {
  if (!value) return "—";
  const str = String(value);
  if (str.length <= 8) return str;
  return `${str.slice(0, 4)}…${str.slice(-4)}`;
}

export function formatBucketLabel(value, bucket = "day") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  if (bucket === "hour") {
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
    });
  }
  if (bucket === "week") {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
