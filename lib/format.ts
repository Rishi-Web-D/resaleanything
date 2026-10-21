export const inr = (n: number) => "₹ " + n.toLocaleString("en-IN");

export function timeAgo(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - +new Date(iso)) / 60_000));
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "Yesterday" : `${d} days ago`;
}
