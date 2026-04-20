# Furnisy Next.js Architecture

## Stack
- Next.js App Router
- TypeScript
- Tailwind CSS

## Folder Design
- `app/`: Route-level pages and URL structure.
- `components/layout/`: Shared shell (`Header`, `Footer`).
- `components/pages/`: Page-level composition blocks (hero and home sections).
- `components/ui/`: Reusable cards and section headings.
- `lib/`: Shared content/data models and utility functions.
- `docs/`: Architecture notes and implementation decisions.

## Route Map
- `/`: Home
- `/shop`: Product listing
- `/compare`: Compare products placeholder
- `/account`: Account/auth UI placeholder
- `/cart`: Cart summary
- `/category/[slug]`: Category detail page
- `/product/[slug]`: Product detail page
- `/blog`: Blog listing
- `/blog/[slug]`: Blog detail page
- `/about`: About page
- `/contact`: Contact page
- `/privacy`: Privacy policy page

## Data Strategy
- Current content is static in `lib/store-data.ts` to match the reference website quickly.
- Replace static arrays with API/CMS data by:
  - Moving reads into server actions or route handlers.
  - Adding revalidation (`revalidate`) for ISR where needed.
  - Introducing typed data fetchers in `lib/`.

## Next Steps
1. Integrate real media assets for hero, products, and categories.
2. Add cart state management (Context, Zustand, or server cart).
3. Implement auth flow for `/account`.
4. Add SEO metadata per dynamic route.
5. Add checkout flow and payment integration.
