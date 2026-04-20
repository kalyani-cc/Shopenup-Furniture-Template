# Return Item Defect Module

This module handles storing defect images and details for return items.

## Database Setup

### Running the Migration

The module includes a MikroORM migration that creates the `return_item_defect` table. To run the migration:

```bash
# Build the project first
npm run build

# Run migrations
npx shopenup migrations run
```

### Manual Migration (Alternative)

If you prefer to run the migration manually, you can execute the SQL from `migrations/Migration20250101000000.ts`:

```sql
CREATE TABLE IF NOT EXISTS return_item_defect (
  id VARCHAR(255) PRIMARY KEY,
  return_item_id VARCHAR(255) NOT NULL,
  defective_quantity INTEGER NOT NULL DEFAULT 1,
  image_url TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_return_item_defect_return_item_id 
ON return_item_defect(return_item_id);
```

## Module Structure

- `models/return-item-defect.ts` - MikroORM entity definition
- `migrations/Migration20250101000000.ts` - Database migration
- `service.ts` - Service class with CRUD operations
- `index.ts` - Module definition and exports

## API Endpoints

### Store API

- `POST /store/uploads` - Upload defect images
- `POST /store/custom/return-item-defects` - Create defect record
- `GET /store/custom/return-item-defects?return_item_id=<id>` - Get defects by return item
- `GET /store/custom/return-item-defects?return_id=<id>` - Get defects by return

### Admin API

- `GET /admin/custom/return-item-defects?return_item_id=<id>` - Get defects by return item
- `GET /admin/custom/return-item-defects?return_id=<id>` - Get defects by return

## Usage

The module is automatically registered in `shopenup-config.js`. The service can be resolved using:

```typescript
const defectService = container.resolve("returnItemDefectModuleService")
```

## Entity Model

The `ReturnItemDefect` entity includes:
- `id` - Primary key (auto-generated)
- `return_item_id` - Foreign key to return_item table
- `defective_quantity` - Number of defective items
- `image_url` - URL of the defect image
- `note` - Optional note about the defect
- `created_at` - Timestamp of creation

