import Link from "next/link";

const columns = [
  {
    heading: "Home Decor Solutions",
    links: ["Interior Designer", "Furniture Analytics", "Boutique Furniture Store"]
  },
  {
    heading: "Furnisy",
    links: ["About Furnisy", "Join Our Team", "Get in Touch"]
  },
  {
    heading: "Resources",
    links: ["Our Customers", "Smart Furniture Finance", "Guides on Furniture Design"]
  }
];

export function Footer() {
  return (
    <footer className="mt-20 bg-stone-900 text-stone-100">
      <div className="mx-auto max-w-7xl space-y-10 px-6 py-14">
        <div className="grid gap-8 md:grid-cols-3">
          {columns.map((column) => (
            <div key={column.heading}>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-300">
                {column.heading}
              </h3>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link} className="text-sm text-stone-200">
                    {link}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col justify-between gap-3 border-t border-stone-700 pt-6 text-sm text-stone-300 md:flex-row">
          <p>© 2025 Furnisy Furniture. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/contact" className="hover:text-white">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
