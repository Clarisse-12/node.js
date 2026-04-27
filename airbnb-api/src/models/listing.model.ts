export interface Listing {
  id: number;
  title: string;
  description: string;
  location: string;
  pricePerNight: number;
  guests: number;
  type: "apartment" | "house" | "villa" | "cabin";
  amenities: string[];
  rating?: number;
  host: string;
}

export const listings: Listing[] = [
  {
    id: 1,
    title: "Sunny City Apartment",
    description: "A bright apartment near museums and cafes.",
    location: "New York, USA",
    pricePerNight: 140,
    guests: 2,
    type: "apartment",
    amenities: ["WiFi", "Kitchen", "Air Conditioning"],
    rating: 4.6,
    host: "Aisha Bello"
  },
  {
    id: 2,
    title: "Lakeside Cabin Retreat",
    description: "Quiet cabin with lake views and private deck.",
    location: "Banff, Canada",
    pricePerNight: 210,
    guests: 4,
    type: "cabin",
    amenities: ["Parking", "Fireplace", "Hot Tub"],
    rating: 4.9,
    host: "Maria Rossi"
  },
  {
    id: 3,
    title: "Family House with Garden",
    description: "Spacious home with backyard and grill.",
    location: "Austin, USA",
    pricePerNight: 180,
    guests: 6,
    type: "house",
    amenities: ["WiFi", "Washer", "Free Parking"],
    host: "Aisha Bello"
  }
];
