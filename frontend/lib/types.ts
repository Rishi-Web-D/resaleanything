export type Condition = "new" | "like-new" | "good" | "fair";

export interface Ad {
  id: string;
  userId: string;
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
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface ConversationView {
  id: string; adId: string; adTitle: string; other: string; lastMessage: string | null; lastAt: string; mine: "buyer" | "seller";
}
// id is the per-conversation sequence number (used for polling with ?after=)
export interface MessageView { id: number; senderId: string; body: string; createdAt: string }

export const CONDITIONS: { value: Condition; label: string }[] = [
  { value: "new", label: "Brand new" },
  { value: "like-new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
];
