// src/api/custom/validators.ts
import { z } from "zod"

export const GetProductsFilterSchema = z.object({
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
  price_min: z.coerce.number().optional(),
  price_max: z.coerce.number().optional(),
  category_id: z.string().optional(),
})