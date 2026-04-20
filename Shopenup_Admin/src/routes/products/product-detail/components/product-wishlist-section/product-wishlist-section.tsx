import { HttpTypes } from "@shopenup/types"
import { Container, Heading, Text } from "@shopenup/ui"
import { useWishlistCount } from "../../../../../hooks/api/use-wishlist"

type ProductWishlistSectionProps = {
  product: HttpTypes.AdminProduct
}

export const ProductWishlistSection = ({
  product,
}: ProductWishlistSectionProps) => {
  const { count, loading, error } = useWishlistCount(product.id)

  return (
    <Container className="flex flex-col gap-y-4 px-6 py-4">
      <div className="flex items-center justify-between">
        <Heading level="h2">Wishlist</Heading>
      </div>

      <div>
        {loading ? (
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            Loading...
          </Text>
        ) : error ? (
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            This product is in 0 wishlists.
          </Text>
        ) : (
          <Text size="small" leading="compact" className="text-ui-fg-base">
            This product is in {count} wishlist{count !== 1 ? "s" : ""}.
          </Text>
        )}
      </div>
    </Container>
  )
}

