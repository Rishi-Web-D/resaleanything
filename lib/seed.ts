import type { Ad } from "./types";

const day = 86_400_000;
const ago = (d: number) => new Date(Date.now() - d * day).toISOString();

type S = [string, string, number, string, Ad["condition"], string, string, string, number];
// title, description, price, category, condition, city, seller, emoji, age(days)
const rows: S[] = [
  ["iPhone 13 128GB Midnight", "Battery health 89%, no scratches, box and charger included. One owner.", 38500, "mobiles", "good", "Mumbai", "Aarav", "📱", 0.2],
  ["Samsung Galaxy S21 FE", "Used for 8 months, with back cover and tempered glass.", 21000, "mobiles", "like-new", "Pune", "Sneha", "📱", 1],
  ["OnePlus Nord CE 3", "Under warranty till Mar. Bill available.", 16500, "mobiles", "like-new", "Bengaluru", "Karthik", "📱", 2],
  ["MacBook Air M1 8/256", "Light use for college. 120 charge cycles. Space grey.", 52000, "electronics", "like-new", "Delhi", "Ritika", "💻", 0.5],
  ["Sony WH-1000XM4 Headphones", "Great ANC, comes with hard case and cable.", 12500, "electronics", "good", "Hyderabad", "Imran", "🎧", 3],
  ["Canon EOS 200D + 18-55 lens", "Shutter count ~8k. Bag and extra battery included.", 28000, "electronics", "good", "Chennai", "Divya", "📷", 4],
  ["PlayStation 5 Disc Edition", "Two controllers, three games. Warranty left 5 months.", 39000, "electronics", "like-new", "Bengaluru", "Rohan", "🎮", 1.5],
  ["Royal Enfield Classic 350 (2020)", "18,000 km, first owner, all papers clear, insurance valid.", 135000, "vehicles", "good", "Jaipur", "Vikram", "🏍️", 2],
  ["Honda Activa 6G", "2022 model, 9,500 km, single owner.", 58000, "vehicles", "good", "Mumbai", "Pooja", "🛵", 5],
  ["Hero Sprint Cycle 21 gear", "Barely used, 26 inch. Suits age 12+.", 4500, "vehicles", "like-new", "Pune", "Nikhil", "🚲", 6],
  ["L-shaped sofa, 6 seater", "Grey fabric, very comfortable. Moving out sale.", 17500, "furniture", "good", "Bengaluru", "Meera", "🛋️", 1],
  ["Solid wood study table", "Sheesham wood, 4 ft with two drawers.", 6200, "furniture", "good", "Delhi", "Anil", "🪑", 3],
  ["King size bed with storage", "Engineered wood, mattress not included.", 14000, "furniture", "fair", "Hyderabad", "Fatima", "🛏️", 7],
  ["Nike Air Max size UK 9", "Worn twice. Original box.", 3800, "fashion", "like-new", "Mumbai", "Dev", "👟", 2],
  ["Leather jacket (M)", "Genuine leather, black. Dry cleaned.", 2900, "fashion", "good", "Kolkata", "Sourav", "🧥", 8],
  ["Fossil chronograph watch", "Original, new battery. Box and papers.", 5200, "fashion", "good", "Chennai", "Lakshmi", "⌚", 4],
  ["UPSC prep book set (35 books)", "Latest edition, lightly highlighted.", 4800, "books", "good", "Delhi", "Ankit", "📚", 3],
  ["Yamaha F310 acoustic guitar", "With gig bag, tuner and picks.", 4200, "books", "good", "Pune", "Isha", "🎸", 5],
  ["LG 260L double door fridge", "Frost free, 4 years old, works perfectly.", 13500, "appliances", "good", "Jaipur", "Suresh", "🧊", 2],
  ["Front load washing machine 7kg", "IFB, 3 years old, serviced recently.", 15500, "appliances", "good", "Bengaluru", "Nandini", "🧺", 6],
  ["Voltas 1.5 ton split AC", "5 star inverter. Installation help provided.", 22000, "appliances", "like-new", "Hyderabad", "Faisal", "❄️", 1],
  ["Yonex badminton racquet pair", "Astrox series, with covers and shuttles.", 3600, "sports", "like-new", "Chennai", "Arjun", "🏸", 4],
  ["Motorised treadmill", "2.5 HP, foldable, little use.", 18000, "sports", "good", "Mumbai", "Kavya", "🏃", 9],
  ["Kids ride-on electric car", "Rechargeable, remote control, age 2-5.", 5400, "kids", "good", "Kolkata", "Mitali", "🚗", 3],
  ["LEGO Technic 42115 set", "Complete, with manual, built once.", 9800, "kids", "like-new", "Delhi", "Rahul", "🧱", 5],
  ["Large dog cage + bed", "Foldable steel cage, size L.", 2800, "pets", "good", "Pune", "Tanvi", "🐕", 10],
];

export const SEED_ADS: Ad[] = rows.map(([title, description, price, category, condition, city, seller, emoji, age], i) => ({
  id: String(1000 + i),
  title,
  description,
  price,
  category,
  condition,
  city,
  seller,
  phone: `98${String(10000000 + i * 137531).slice(0, 8)}`,
  emoji,
  hue: (i * 47) % 360,
  createdAt: ago(age),
  featured: i % 5 === 0,
}));
