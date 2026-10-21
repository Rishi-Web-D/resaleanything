export type Condition = "new" | "like-new" | "good" | "fair";

export interface Ad {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: Condition;
  city: string;
  seller: string;
  phone: string;
  emoji: string;
  hue: number;
  createdAt: string;
  featured?: boolean;
}

export const CONDITIONS: { value: Condition; label: string }[] = [
  { value: "new", label: "Brand new" },
  { value: "like-new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
];
