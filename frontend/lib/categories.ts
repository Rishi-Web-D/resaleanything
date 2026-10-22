export const CATEGORIES = [
  { slug: "mobiles", name: "Mobiles", emoji: "📱" },
  { slug: "electronics", name: "Electronics", emoji: "💻" },
  { slug: "vehicles", name: "Vehicles", emoji: "🏍️" },
  { slug: "furniture", name: "Furniture", emoji: "🛋️" },
  { slug: "fashion", name: "Fashion", emoji: "👟" },
  { slug: "books", name: "Books & Hobbies", emoji: "📚" },
  { slug: "appliances", name: "Appliances", emoji: "🧺" },
  { slug: "sports", name: "Sports & Fitness", emoji: "🏏" },
  { slug: "kids", name: "Kids & Toys", emoji: "🧸" },
  { slug: "pets", name: "Pet Supplies", emoji: "🐶" },
] as const;

export const CITIES = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Pune", "Chennai", "Kolkata", "Jaipur"];

export const categoryName = (slug: string) => CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;

export const categoryEmoji = (slug: string) => CATEGORIES.find((c) => c.slug === slug)?.emoji ?? "🛍️";
