export type NavItem = {
  label: string;
  href: string;
};

export type Category = {
  slug: string;
  name: string;
  products: number;
  description: string;
};

export type Product = {
  slug: string;
  id?: string;
  variantId?: string;
  name: string;
  price: number;
  oldPrice?: number;
  rating?: number;
  reviewCount?: number;
  category: string;
  categoryLabel?: string;
  /** Collection handle for filters and URLs; use collectionLabel for display when set. */
  collection?: string;
  collectionLabel?: string;
  badge?: "new" | "sale";
  description: string;
  image?: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  category: string;
  author: string;
  excerpt: string;
};

export const navItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Blog", href: "/blog" }
];

export const categories: Category[] = [
  {
    slug: "bed-room",
    name: "Bed Room",
    products: 15,
    description: "Warm and modern bedroom furniture sets."
  },
  {
    slug: "living-room",
    name: "Living Room",
    products: 5,
    description: "Elegant sofas, coffee tables, and accent pieces."
  },
  {
    slug: "office",
    name: "Office",
    products: 20,
    description: "Smart office furniture designed for comfort."
  },
  {
    slug: "accessories",
    name: "Accessories",
    products: 15,
    description: "Decor and finishing accessories for every room."
  },
  {
    slug: "kitchen-accessories",
    name: "Kitchen Accessories",
    products: 10,
    description: "Practical and beautiful kitchen essentials."
  }
];

export const products: Product[] = [
  {
    slug: "modern-dark-wood-chair",
    name: "Modern Dark Wood Chair",
    price: 299,
    category: "living-room",
    description: "A modern chair with premium dark walnut finish."
  },
  {
    slug: "modular-sofa-with-wood",
    name: "Modular Sofa With Wood",
    price: 399,
    category: "living-room",
    description: "Comfortable modular sofa with wooden side detail."
  },
  {
    slug: "modern-tolik-chair",
    name: "Modern Tolik Chair",
    price: 199,
    category: "office",
    badge: "new",
    description: "Ergonomic chair for workspaces and home offices."
  },
  {
    slug: "ergonomic-cabinet",
    name: "Ergonomic Cabinet",
    oldPrice: 199,
    price: 149.25,
    category: "bed-room",
    badge: "sale",
    description: "Compact cabinet designed for optimized storage."
  },
  {
    slug: "baxter-colette-chair",
    name: "Baxter Colette Chair",
    price: 299,
    category: "office",
    badge: "new",
    description: "Minimal profile with premium upholstery and support."
  },
  {
    slug: "modern-accent-chair",
    name: "Modern Accent Chair",
    price: 199,
    category: "living-room",
    description: "Clean lines and cozy support for modern interiors."
  },
  {
    slug: "wooden-table-lamp",
    name: "Wooden Table Lamp",
    oldPrice: 199,
    price: 149.25,
    category: "accessories",
    badge: "sale",
    description: "Natural wood texture with warm ambient lighting."
  },
  {
    slug: "cherie-chair",
    name: "Cherie Chair",
    price: 199,
    category: "living-room",
    description: "A versatile chair that fits compact or large spaces."
  }
];

export const blogPosts: BlogPost[] = [
  {
    slug: "comfortable-chairs-home-office-oasis",
    title: "Comfortable Chairs Can Help You Create Your Own Home Office Oasis",
    date: "20 Jan 2025",
    category: "Office Furniture",
    author: "Anna Maria",
    excerpt:
      "A practical walkthrough to pick chairs that improve posture and productivity."
  },
  {
    slug: "ultimate-guide-choosing-perfect-furniture",
    title: "The Ultimate Guide to Choosing a Perfect Furniture for Your Home.",
    date: "14 Aug 2025",
    category: "Office Furniture",
    author: "Anna Maria",
    excerpt:
      "How to align material, style, and layout to create a cohesive home interior."
  },
  {
    slug: "furniture-layout-mistakes-to-avoid",
    title: "Furniture Layout Mistakes To Avoid In Modern Homes",
    date: "18 Aug 2025",
    category: "Office Furniture",
    author: "Anna Maria",
    excerpt: "Common planning issues and simple corrections for better room flow."
  }
];
