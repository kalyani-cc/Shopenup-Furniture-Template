import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight } from "@shopenup/icons"
import { AdminOrder, AdminOrderLineItem, AdminReturn } from "@shopenup/types"
import { Alert, Button, Input, Switch, Text, toast } from "@shopenup/ui"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import * as zod from "zod"

import { Form } from "../../../../../components/common/form"
import { Thumbnail } from "../../../../../components/common/thumbnail"
import { RouteDrawer, useRouteModal } from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import { useStockLocation } from "../../../../../hooks/api"
import {
  useAddReceiveItems,
  useCancelReceiveReturn,
  useConfirmReturnReceive,
  useRemoveReceiveItems,
  useUpdateReceiveItem,
} from "../../../../../hooks/api/returns"
import { getStylizedAmount } from "../../../../../lib/money-amount-helpers"
import { sdk } from "../../../../../lib/client"
import { ReceiveReturnSchema } from "./constants"
import DismissedQuantity from "./dismissed-quantity"

interface ReturnItemDefect {
  id: string
  return_item_id: string
  defective_quantity: number
  image_url: string
  note?: string
  created_at?: string
}

interface PreviewItemWithActions extends AdminOrderLineItem {
  actions?: Array<{
    id: string
    action: string
    details: {
      quantity: number
    }
  }>
}

type OrderAllocateItemsFormProps = {
  order: AdminOrder
  preview: AdminOrder
  orderReturn: AdminReturn
}

export function OrderReceiveReturnForm({
  order,
  preview,
  orderReturn,
}: OrderAllocateItemsFormProps) {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()

  /**
   * Items on the preview order that are part of the return we are receiving currently.
   */
  const previewItems = useMemo(() => {
    const idsMap: Record<string, boolean> = {}

    orderReturn.items.forEach((i) => (idsMap[i.item_id] = true))

    return preview.items.filter((i) => idsMap[i.id]) as PreviewItemWithActions[]
  }, [preview.items, orderReturn])

  const { mutateAsync: confirmReturnReceive } = useConfirmReturnReceive(
    orderReturn.id,
    order.id
  )

  const { mutateAsync: cancelReceiveReturn } = useCancelReceiveReturn(
    orderReturn.id,
    order.id
  )

  const { mutateAsync: addReceiveItems } = useAddReceiveItems(
    orderReturn.id,
    order.id
  )
  const { mutateAsync: updateReceiveItem } = useUpdateReceiveItem(
    orderReturn.id,
    order.id
  )
  const { mutateAsync: removeReceiveItem } = useRemoveReceiveItems(
    orderReturn.id,
    order.id
  )

  const { stock_location } = useStockLocation(
    orderReturn.location_id || "",
    undefined,
    {
      enabled: !!orderReturn.location_id,
    }
  )

  // Fetch defects for this return
  const [defects, setDefects] = useState<ReturnItemDefect[]>([])
  useEffect(() => {
    const fetchDefects = async () => {
      try {
        const response = await sdk.client.fetch<{ defects: ReturnItemDefect[] }>(
          `/admin/custom/return-item-defects?return_id=${orderReturn.id}`,
          {
            method: "GET",
          }
        )
        setDefects(response.defects || [])
      } catch (error: any) {
        console.error("[OrderReceiveReturnForm] Failed to fetch defects:", error)
        setDefects([])
      }
    }
    if (orderReturn.id) {
      fetchDefects()
    }
  }, [orderReturn.id])

  const itemsMap = useMemo(() => {
    const ret: Record<string, AdminOrderLineItem> = {}
    order.items.forEach((i) => (ret[i.id] = i))
    return ret
  }, [order.items])

  const form = useForm<zod.infer<typeof ReceiveReturnSchema>>({
    defaultValues: {
      items: previewItems
        ?.sort((i1, i2) => i1.id.localeCompare(i2.id))
        .map((i) => ({
          item_id: i.id,
        })),
      send_notification: false,
    },
    resolver: zodResolver(ReceiveReturnSchema),
  })

  useEffect(() => {
    previewItems
      ?.sort((i1, i2) => i1.id.localeCompare(i2.id))
      .forEach((item, index) => {
        const receivedAction = item.actions?.find(
          (a: { action: string }) => a.action === "RECEIVE_RETURN_ITEM"
        )
        const dismissedAction = item.actions?.find(
          (a: { action: string }) => a.action === "RECEIVE_DAMAGED_RETURN_ITEM"
        )

        form.setValue(
          `items.${index}.quantity`,
          receivedAction?.details.quantity,
          { shouldTouch: true, shouldDirty: true }
        )
        form.setValue(
          `items.${index}.dismissed_quantity`,
          dismissedAction?.details.quantity,
          { shouldTouch: true, shouldDirty: true }
        )
      })
  }, [previewItems, form])

  /**
   * HANDLERS
   */

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await confirmReturnReceive({ no_notification: !data.send_notification })

      handleSuccess(`/orders/${order.id}`)

      toast.success(t("general.success"), {
        description: t("orders.returns.receive.toast.success"),
      })
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      toast.error(t("general.error"), {
        description: errorMessage,
      })
    }
  })

  const handleQuantityChange = async (
    itemId: string,
    value: number | null | undefined,
    index: number
  ) => {
    const item = previewItems?.find((i) => i.id === itemId)
    if (!item) {
      return
    }
    const action = item.actions?.find(
      (a: { action: string }) => a.action === "RECEIVE_RETURN_ITEM"
    )

    if (typeof value === "number" && value < 0) {
      form.setValue(
        `items.${index}.quantity`,
        item.detail.return_received_quantity,
        { shouldTouch: true, shouldDirty: true }
      )

      toast.error(t("orders.returns.receive.toast.errorNegativeValue"))

      return
    }

    if (typeof value === "number" && value > item.quantity) {
      // reset value in the form and notify the user to be aware that we didn't chang anything

      form.setValue(
        `items.${index}.quantity`,
        item.detail.return_received_quantity,
        { shouldTouch: true, shouldDirty: true }
      )

      toast.error(t("orders.returns.receive.toast.errorLargeValue"))

      return
    }

    try {
      if (action) {
        if (value === null || value === 0 || value === undefined) {
          await removeReceiveItem(action.id)

          return
        }

        await updateReceiveItem({ actionId: action.id, quantity: value })
      } else {
        if (typeof value === "number" && value > 0 && value <= item.quantity) {
          await addReceiveItems({ items: [{ id: item.id, quantity: value }] })
        }
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      toast.error(errorMessage)
    }
  }

  const onFormClose = async (isSubmitSuccessful: boolean) => {
    try {
      if (!isSubmitSuccessful) {
        await cancelReceiveReturn()
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      toast.error(errorMessage)
    }
  }

  return (
    <RouteDrawer.Form form={form} onClose={onFormClose}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex size-full flex-col overflow-hidden"
      >
        <RouteDrawer.Body className="flex size-full flex-col overflow-auto">
          <div className="flex justify-between">
            <div>
              {stock_location && (
                <div className="flex items-center gap-2">
                  <ArrowRight className="text-ui-fg-subtle" />{" "}
                  <span className="text-ui-fg-base txt-small font-medium">
                    {stock_location.name}
                  </span>
                </div>
              )}
            </div>
            <span className="text-ui-fg-muted txt-small text-right">
              {t("orders.returns.receive.itemsLabel")}
            </span>
          </div>
          {previewItems.map((item, ind) => {
            const originalItem = itemsMap[item.id]
            if (!originalItem) {
              return null
            }
            // Find return item ID from orderReturn.items
            const returnItem = orderReturn.items.find((ri) => ri.item_id === item.id)
            const itemDefects = returnItem ? defects.filter((d) => d.return_item_id === returnItem.id) : []

            return (
              <div
                key={item.id}
                className="bg-ui-bg-subtle shadow-elevation-card-rest mt-2 rounded-xl"
              >
                <div className="flex flex-col items-center gap-x-2 gap-y-2 p-3 text-sm md:flex-row">
                  <div className="flex flex-1 items-center gap-x-3">
                    <Text size="small" className="text-ui-fg-subtle">
                      {item.quantity}x
                    </Text>

                    <Thumbnail src={item.thumbnail} />
                    <div className="flex flex-col">
                      <div>
                        <Text className="txt-small" as="span" weight="plus">
                          {item.title}{" "}
                        </Text>
                        {originalItem.variant_sku && (
                          <span>({originalItem.variant_sku})</span>
                        )}
                      </div>
                      {originalItem.variant?.options && originalItem.variant.options.length > 0 ? (
                        <Text as="div" className="text-ui-fg-subtle txt-small">
                          {originalItem.variant.options.map((opt: any) => {
                            const optionTitle = opt.option?.title || opt.option?.name || '';
                            return optionTitle ? `${optionTitle}: ${opt.value}` : opt.value;
                          }).join(" · ")}
                        </Text>
                      ) : originalItem.variant_title ? (
                        <Text as="div" className="text-ui-fg-subtle txt-small">
                          {originalItem.variant_title}
                        </Text>
                      ) : originalItem.product_title ? (
                        <Text as="div" className="text-ui-fg-subtle txt-small">
                          {originalItem.product_title}
                        </Text>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-row items-center gap-2">
                    <DismissedQuantity
                      form={form as any}
                      item={item}
                      index={ind}
                      returnId={orderReturn.id}
                      orderId={order.id}
                    />
                    <Form.Field
                      control={form.control}
                      name={`items.${ind}.quantity`}
                      render={({ field: { onChange, value, ...field } }) => {
                        return (
                          <Form.Item className="w-full">
                            <Form.Control>
                              <Input
                                min={0}
                                max={item.quantity}
                                type="number"
                                value={value ?? ""}
                                className="bg-ui-bg-field-component text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                onChange={(e) => {
                                  const value =
                                    e.target.value === ""
                                      ? null
                                      : parseFloat(e.target.value)

                                  onChange(value)
                                }}
                                {...field}
                                onBlur={() => {
                                  field.onBlur()
                                  handleQuantityChange(item.id, value ?? null, ind)
                                }}
                              />
                            </Form.Control>
                          </Form.Item>
                        )
                      }}
                    />
                  </div>
                </div>
                
                {/* Display defects with images */}
                {itemDefects.length > 0 && (
                  <div className="border-t p-3 space-y-2">
                    <Text className="txt-small font-medium text-ui-fg-base">
                      Customer Uploaded Defect Images:
                    </Text>
                    <div className="flex flex-wrap gap-3">
                      {itemDefects.map((defect) => (
                        <div key={defect.id} className="flex flex-col gap-1">
                          <a
                            href={defect.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <Thumbnail
                              src={defect.image_url}
                              size="base"
                              className="rounded-lg border border-ui-border-base hover:border-ui-border-strong transition-colors"
                            />
                          </a>
                          {defect.note && (
                            <Text className="txt-small text-ui-fg-subtle max-w-[150px] truncate">
                              {defect.note}
                            </Text>
                          )}
                          <Text className="txt-small text-ui-fg-muted">
                            Qty: {defect.defective_quantity}
                          </Text>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* TOTALS*/}

          <div className="my-6 border-b border-t border-dashed py-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="txt-small text-ui-fg-subtle">
                {t("fields.total")}
              </span>
              <span className="txt-small text-ui-fg-subtle">
                {getStylizedAmount(preview.total, order.currency_code)}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-dotted pt-4">
              <span className="txt-small font-medium">
                {t("orders.returns.outstandingAmount")}
              </span>
              <span className="txt-small font-medium">
                {getStylizedAmount(
                  preview.summary.pending_difference || 0,
                  order.currency_code
                )}
              </span>
            </div>
          </div>

          <Alert className="rounded-xl" variant="warning">
            {t("orders.returns.receive.inventoryWarning")}
          </Alert>

          <div className="bg-ui-bg-subtle shadow-elevation-card-rest my-2 rounded-xl p-3">
            <Form.Field
              control={form.control}
              name="send_notification"
              render={({ field: { onChange, value, ...field } }) => {
                return (
                  <Form.Item>
                    <div className="flex items-center gap-3">
                      <Form.Control>
                        <Switch
                          className="mt-1 self-start"
                          checked={!!value}
                          onCheckedChange={onChange}
                          {...field}
                        />
                      </Form.Control>
                      <div className="flex flex-col">
                        <Form.Label>
                          {t("orders.returns.sendNotification")}
                        </Form.Label>
                        <Form.Hint className="!mt-1">
                          {t("orders.returns.receive.sendNotificationHint")}
                        </Form.Hint>
                      </div>
                    </div>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
          </div>
        </RouteDrawer.Body>
        <RouteDrawer.Footer className="overflow-hidden">
          <div className="flex items-center gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button size="small" type="submit" isLoading={false}>
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}
