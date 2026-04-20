import { HttpTypes } from "@shopenup/types"
import { defer, LoaderFunctionArgs } from "react-router-dom"
import { sdk } from "../../../lib/client"
import { PRODUCT_VARIANT_IDS_KEY } from "../common/constants"

async function getProductStockData(id: string, productVariantIds?: string[]) {
  try {
    const CHUNK_SIZE = 20
    let offset = 0
    let totalCount = 0

    let allVariants: HttpTypes.AdminProductVariant[] = []

    do {
      const { variants: chunk, count } = await sdk.admin.product.listVariants(
        id,
        {
          id: productVariantIds,
          offset,
          limit: CHUNK_SIZE,
          fields:
            "id,title,sku,inventory_items,inventory_items.*,inventory_items.inventory,inventory_items.inventory.id,inventory_items.inventory.title,inventory_items.inventory.sku,*inventory_items.inventory.location_levels,product.thumbnail",
        }
      )

      allVariants = [...allVariants, ...chunk]
      totalCount = count
      offset += CHUNK_SIZE
    } while (allVariants.length < totalCount)

    const { stock_locations } = await sdk.admin.stockLocation.list({
      limit: 9999,
      fields: "id,name",
    })

    return {
      variants: allVariants,
      locations: stock_locations,
    }
  } catch (error) {
    console.error('❌ [getProductStockData] Error fetching product stock data:', error);
    throw error;
  }
}

export const productStockLoader = async ({
  params,
  request,
}: LoaderFunctionArgs) => {
  try {
    const id = params.id!
    const searchParams = new URLSearchParams(request.url)
    const productVariantIds =
      searchParams.get(PRODUCT_VARIANT_IDS_KEY)?.split(",") || undefined

    const dataPromise = getProductStockData(id, productVariantIds)

    return defer({
      data: dataPromise,
    })
  } catch (error) {
    console.error('❌ [product-stock-loader] Error loading product stock:', error);
    throw error; // Re-throw to let React Router handle it
  }
}
