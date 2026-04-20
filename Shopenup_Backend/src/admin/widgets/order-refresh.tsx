import { defineWidgetConfig } from "@shopenup/admin-sdk"
import { IconButton, Tooltip } from "@shopenup/ui"
import { useQueryClient } from "@tanstack/react-query"
import { ArrowPath } from "@shopenup/icons"

const OrderListRefreshWidget = () => {
  const queryClient = useQueryClient()

  const onRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["orders"] })
  }

  return (
    <div className="flex w-full justify-end">
  <Tooltip content="Refresh orders">
    <IconButton variant="primary" size="small" onClick={onRefresh}>
      <ArrowPath className="h-4 w-4" />
    </IconButton>
  </Tooltip>
</div>
  )
}

export const config = defineWidgetConfig({
  zone: "order.list.before",
})

export default OrderListRefreshWidget
