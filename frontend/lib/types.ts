export type Condition = "new" | "like-new" | "good" | "fair";

export interface Ad {
  id: number;
  userId: number;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: Condition;
  city: string;
  seller: string;
  status: "active" | "sold";
  featured: boolean;
  createdAt: string;
  images: string[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
}

export interface ConversationView {
  id: number; adId: number; adTitle: string; other: string; lastMessage: string | null; lastAt: string; mine: "buyer" | "seller";
}
export interface MessageView { id: number; senderId: number; body: string; createdAt: string }

export const CONDITIONS: { value: Condition; label: string }[] = [
  { value: "new", label: "Brand new" },
  { value: "like-new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
];
