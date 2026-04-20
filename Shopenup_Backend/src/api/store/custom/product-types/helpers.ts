import { ShopenupContainer, ProductTypeDTO } from "@shopenup/framework/types"

export const refetchProductType = async (
  productTypeId: string,
  scope: ShopenupContainer,
  fields: (keyof ProductTypeDTO)[]
) => {
  const query = scope.resolve("query")
  const { data: [ productType ] } = await query.graph({
    entity: "product_type",
    filters: { id: productTypeId },
    fields,
  })

  return productType 
}
