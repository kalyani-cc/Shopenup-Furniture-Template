import { zodResolver } from "@hookform/resolvers/zod"
import { PencilSquare } from "@shopenup/icons"
import {
  AdminOrder,
  AdminOrderPreview,
  AdminReturn,
  InventoryLevelDTO,
} from "@shopenup/types"
import {
  Alert,
  Button,
  CurrencyInput,
  Heading,
  IconButton,
  Switch,
  Text,
  toast,
} from "@shopenup/ui"
import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { useFieldArray, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"

import {
  RouteFocusModal,
  StackedFocusModal,
  useRouteModal,
  useStackedModal,
} from "../../../../../components/modals"

import { Form } from "../../../../../components/common/form"
import { Combobox } from "../../../../../components/inputs/combobox"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import {
  useAddReturnItem,
  useAddReturnShipping,
  useCancelReturnRequest,
  useConfirmReturnRequest,
  useDeleteReturnShipping,
  useRemoveReturnItem,
  useUpdateReturn,
  useUpdateReturnItem,
  useUpdateReturnShipping,
} from "../../../../../hooks/api/returns"
import { useShippingOptions } from "../../../../../hooks/api/shipping-options"
import { useStockLocations } from "../../../../../hooks/api/stock-locations"
import { sdk } from "../../../../../lib/client"
import { currencies } from "../../../../../lib/data/currencies"
import { getStylizedAmount } from "../../../../../lib/money-amount-helpers"
import { ReturnShippingPlaceholder } from "../../../common/placeholders"
import { AddReturnItemsTable } from "../add-return-items-table"
import { ReturnItem } from "./return-item"
import { ReturnCreateSchema, ReturnCreateSchemaType } from "./schema"

type ReturnCreateFormProps = {
  order: AdminOrder
  activeReturn: AdminReturn
  preview: AdminOrderPreview
}

let selectedItems: string[] = []

export const ReturnCreateForm = ({
  order,
  preview,
  activeReturn,
}: ReturnCreateFormProps) => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()

  const itemsMap = useMemo(
    () => new Map((order.items || []).map((i) => [i.id, i])),
    [order.items]
  )

  /**
   * Only consider items that belong to this return.
   */
  const previewItems = useMemo(
    () =>
      preview.items.filter(
        (i) => !!i.actions?.find((a) => a.return_id === activeReturn.id)
      ),
    [preview.items]
  )

  const previewItemsMap = useMemo(
    () => new Map(previewItems.map((i) => [i.id, i])),
    [previewItems]
  )

  /**
   * STATE
   */
  const { setIsOpen } = useStackedModal()
  const [isShippingPriceEdit, setIsShippingPriceEdit] = useState(false)
  const [customShippingAmount, setCustomShippingAmount] = useState<{
    value: string
    float: number | null
  }>({
    value: "0",
    float: 0,
  })
  const [inventoryMap, setInventoryMap] = useState<
    Record<string, InventoryLevelDTO[]>
  >({})
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  /**
   * HOOKS
   */
  const { stock_locations = [] } = useStockLocations({ limit: 999 })
  const { shipping_options = [] } = useShippingOptions({
    limit: 999,
    fields: "*prices,+service_zone.fulfillment_set.location.id",
    /**
     * TODO: this should accept filter for location_id
     */
  })

  /**
   * MUTATIONS
   */
  const { mutateAsync: confirmReturnRequest, isPending: isConfirming } =
    useConfirmReturnRequest(activeReturn.id, order.id)

  const { mutateAsync: cancelReturnRequest, isPending: isCanceling } =
    useCancelReturnRequest(activeReturn.id, order.id)
  const { mutateAsync: updateReturnRequest, isPending: isUpdating } =
    useUpdateReturn(activeReturn.id, order.id)

  const { mutateAsync: addReturnShipping, isPending: isAddingReturnShipping } =
    useAddReturnShipping(activeReturn.id, order.id)

  const {
    mutateAsync: updateReturnShipping,
    isPending: isUpdatingReturnShipping,
  } = useUpdateReturnShipping(activeReturn.id, order.id)

  const {
    mutateAsync: deleteReturnShipping,
    isPending: isDeletingReturnShipping,
  } = useDeleteReturnShipping(activeReturn.id, order.id)

  const { mutateAsync: addReturnItem, isPending: isAddingReturnItem } =
    useAddReturnItem(activeReturn.id, order.id)

  const { mutateAsync: removeReturnItem, isPending: isRemovingReturnItem } =
    useRemoveReturnItem(activeReturn.id, order.id)

  const { mutateAsync: updateReturnItem, isPending: isUpdatingReturnItem } =
    useUpdateReturnItem(activeReturn.id, order.id)

  const isRequestLoading =
    isConfirming ||
    isCanceling ||
    isAddingReturnShipping ||
    isUpdatingReturnShipping ||
    isDeletingReturnShipping ||
    isAddingReturnItem ||
    isRemovingReturnItem ||
    isUpdatingReturnItem ||
    isUpdating

  /**
   * FORM
   */

  const form = useForm<ReturnCreateSchemaType>({
    /**
     * TODO: reason selection once Return reason settings are added
     */
    defaultValues: () => {
      // Extract location from order fulfillments (same as backend/storefront)
      let orderLocationId: string | undefined = undefined
      if (order.fulfillments && order.fulfillments.length > 0) {
        const fulfillment = order.fulfillments[0] as any
        orderLocationId = fulfillment.location_id || undefined
      }

      // Extract shipping option from order's shipping methods
      let orderShippingOptionId: string | undefined = undefined
      if (order.shipping_methods && order.shipping_methods.length > 0) {
        const orderShippingMethod = order.shipping_methods[0] as any
        orderShippingOptionId = orderShippingMethod.shipping_option_id || undefined
      }

      // Fallback to preview shipping method if order doesn't have one
      const method = preview.shipping_methods.find(
        (s) => !!s.actions?.find((a) => a.action === "SHIPPING_ADD")
      )

      return Promise.resolve({
        items: previewItems.map((i) => ({
          item_id: i.id,
          quantity: i.detail.return_requested_quantity,
          note: i.actions?.find((a) => a.action === "RETURN_ITEM")
            ?.internal_note ?? undefined,
          reason_id: (i.actions?.find((a) => a.action === "RETURN_ITEM")?.details
            ?.reason_id as string | null | undefined) ?? undefined,
        })),
        option_id: method?.shipping_option_id ?? "",
        location_id: activeReturn?.location_id,
        send_notification: false,
      })
    },
    resolver: zodResolver(ReturnCreateSchema),
  })

  const {
    fields: items,
    append,
    remove,
    update,
  } = useFieldArray({
    name: "items",
    control: form.control,
  })

  useEffect(() => {
    const existingItemsMap: Record<string, boolean> = {}

    previewItems.forEach((i) => {
      const ind = items.findIndex((field) => field.item_id === i.id)

      /**
       * THESE ITEMS ARE REMOVED FROM RETURN REQUEST
       */
      if (!i.detail.return_requested_quantity) {
        return
      }

      existingItemsMap[i.id] = true

      if (ind > -1) {
        if (items[ind].quantity !== i.detail.return_requested_quantity) {
          const returnItemAction = i.actions?.find(
            (a) => a.action === "RETURN_ITEM"
          )

          update(ind, {
            ...items[ind],
            quantity: i.detail.return_requested_quantity,
            note: returnItemAction?.internal_note ?? undefined,
            reason_id: (returnItemAction?.details?.reason_id as string | null | undefined) ?? undefined,
          })
        }
      } else {
        append({ item_id: i.id, quantity: i.detail.return_requested_quantity })
      }
    })

    items.forEach((i, ind) => {
      if (!(i.item_id in existingItemsMap)) {
        remove(ind)
      }
    })
  }, [previewItems])

  const showPlaceholder = !items.length
  const locationId = form.watch("location_id")
  const shippingOptionId = form.watch("option_id")

  const handleSubmit = form.handleSubmit(async () => {
    // This is kept for form validation, but actual submission happens via handleConfirmClick
    // The form submission is prevented and handled by the custom dialog
  })

  const handleConfirmClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // If Ctrl/Cmd is pressed, allow default form submission (current working behavior)
    if (e.ctrlKey || e.metaKey) {
      return
    }
    
    // For normal clicks, prevent default and show custom confirmation dialog
    e.preventDefault()
    e.stopPropagation()
    
    // First validate the form
    const isValid = await form.trigger()
    if (!isValid) {
      // Form validation failed, let react-hook-form handle the errors
      return
    }
    
    // Form is valid, show custom confirmation dialog
    setShowConfirmDialog(true)
  }

  const handleConfirmReturn = async () => {
    try {
      setShowConfirmDialog(false)
      
      // Get form data and submit
      const formData = form.getValues()
      await confirmReturnRequest({ no_notification: !formData.send_notification })

      handleSuccess()
    } catch (error: any) {
      toast.error(t("general.error"), {
        description: error?.message || String(error),
      })
    }
  }

  const onItemsSelected = () => {
    addReturnItem({
      items: selectedItems.map((id) => ({
        id,
        quantity: 1,
      })),
    })

    setIsOpen("items", false)
  }

  const onLocationChange = async (selectedLocationId: string) => {
    await updateReturnRequest({ location_id: selectedLocationId })
  }

  const onShippingOptionChange = async (
    selectedOptionId: string | undefined
  ) => {
    const promises = preview.shipping_methods
      .map((s) => s.actions?.find((a) => a.action === "SHIPPING_ADD")?.id)
      .filter((id): id is string => Boolean(id))
      .map((id) => deleteReturnShipping(id))

    await Promise.all(promises)

    if (selectedOptionId) {
      await addReturnShipping({ shipping_option_id: selectedOptionId })
    }
  }

  useEffect(() => {
    if (isShippingPriceEdit) {
      const input = document.getElementById("js-shipping-input")
      if (input) {
        input.focus()
      }
    }
  }, [isShippingPriceEdit])

  useEffect(() => {
    // Extract location from order fulfillments (same as backend/storefront)
    let orderLocationId: string | undefined = undefined
    if (order.fulfillments && order.fulfillments.length > 0) {
      const fulfillment = order.fulfillments[0] as any
      orderLocationId = fulfillment.location_id || undefined
    }

    // Use activeReturn location if available, otherwise use order's fulfillment location
    const locationId = activeReturn?.location_id || orderLocationId || ""
    form.setValue("location_id", locationId)
    
    // If location is set and we don't have a shipping option yet, try to set it from order
    if (locationId && !form.getValues("option_id")) {
      // Extract shipping option from order's shipping methods
      if (order.shipping_methods && order.shipping_methods.length > 0) {
        const orderShippingMethod = order.shipping_methods[0] as any
        const orderShippingOptionId = orderShippingMethod.shipping_option_id
        if (orderShippingOptionId) {
          form.setValue("option_id", orderShippingOptionId)
        }
      }
    }
  }, [activeReturn, order.fulfillments, order.shipping_methods])

  // Fix z-index issue: Ensure prompt dialogs appear above RouteFocusModal (z-index 100)
  // RouteFocusModal has z-index 100, StackedFocusModal has z-index 120
  // Prompt dialogs need to be above both, so use z-index 200+ (much higher to ensure visibility)
  useEffect(() => {
    const styleId = 'return-create-prompt-zindex-fix'
    let styleElement = document.getElementById(styleId)
    
    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = styleId
      document.head.appendChild(styleElement)
    }
    
    // Use very high z-index to ensure prompt appears above all modals
    styleElement.textContent = `
      /* Ensure prompt dialogs appear above ALL modals - Very aggressive targeting */
      /* Target all possible dialog/alert/prompt elements */
      [data-radix-dialog-overlay],
      [data-radix-dialog-content],
      [data-rac-dialog-overlay],
      [data-rac-dialog-content],
      [role="dialog"][data-radix-dialog],
      [role="dialog"][data-rac-dialog],
      [role="alertdialog"],
      /* Target any dialog portal containers - these are direct children of body */
      body > div[data-radix-portal],
      body > div[data-rac-portal],
      body > div[data-radix-portal] > div,
      body > div[data-rac-portal] > div,
      /* Target prompt-specific elements */
      [class*="Prompt"],
      [class*="prompt"],
      [class*="AlertDialog"],
      [class*="alert-dialog"],
      /* Target any overlay that might be a prompt */
      [data-radix-dialog-overlay],
      [data-rac-dialog-overlay],
      /* Target any element with dialog-related classes */
      [class*="Dialog"],
      [class*="dialog"] {
        z-index: 200 !important;
      }
      
      /* Specifically target dialog content with even higher z-index */
      [data-radix-dialog-content],
      [data-rac-dialog-content],
      body > div[data-radix-portal] [data-radix-dialog-content],
      body > div[data-rac-portal] [data-rac-dialog-content] {
        z-index: 201 !important;
      }
      
      /* Target portal containers themselves */
      body > div[data-radix-portal]:has([data-radix-dialog-content]),
      body > div[data-rac-portal]:has([data-rac-dialog-content]) {
        z-index: 200 !important;
      }
    `
    
    // Use MutationObserver to ensure dynamically created prompt dialogs get correct z-index
    const applyZIndexToDialogs = () => {
      // Find all dialog-related elements
      const dialogs = document.querySelectorAll(
        '[data-radix-dialog-overlay], [data-radix-dialog-content], [data-rac-dialog-overlay], [data-rac-dialog-content], [role="dialog"], [role="alertdialog"], body > div[data-radix-portal], body > div[data-rac-portal]'
      )
      
      dialogs.forEach((dialog) => {
        const element = dialog as HTMLElement
        
        // Check if it's a portal container
        if (element.hasAttribute('data-radix-portal') || element.hasAttribute('data-rac-portal')) {
          const hasDialog = element.querySelector('[data-radix-dialog-content], [data-rac-dialog-content], [role="dialog"]')
          if (hasDialog) {
            element.style.zIndex = '200'
          }
          return
        }
        
        // For dialog elements themselves
        const currentZIndex = window.getComputedStyle(element).zIndex
        const zIndexNum = parseInt(currentZIndex) || 0
        
        // If z-index is less than 200, update it
        if (zIndexNum < 200) {
          if (element.hasAttribute('data-radix-dialog-content') || element.hasAttribute('data-rac-dialog-content')) {
            element.style.zIndex = '201'
          } else {
            element.style.zIndex = '200'
          }
        }
      })
      
      // Also check for any new portal containers that might have been added
      const portals = document.querySelectorAll('body > div[data-radix-portal], body > div[data-rac-portal]')
      portals.forEach((portal) => {
        const portalElement = portal as HTMLElement
        const hasDialog = portalElement.querySelector('[data-radix-dialog-content], [data-rac-dialog-content], [role="dialog"], [role="alertdialog"]')
        if (hasDialog) {
          portalElement.style.zIndex = '200'
          // Also set z-index on the dialog elements inside
          const dialogElements = portalElement.querySelectorAll('[data-radix-dialog-content], [data-rac-dialog-content]')
          dialogElements.forEach((dialogEl) => {
            (dialogEl as HTMLElement).style.zIndex = '201'
          })
        }
      })
    }
    
    // Apply immediately and observe for changes
    applyZIndexToDialogs()
    
    // Use a more aggressive observer that checks more frequently
    const observer = new MutationObserver(() => {
      // Small delay to ensure DOM is fully updated
      setTimeout(() => {
        applyZIndexToDialogs()
      }, 0)
    })
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'data-radix-dialog-overlay', 'data-radix-dialog-content', 'data-rac-dialog-overlay', 'data-rac-dialog-content', 'data-radix-portal', 'data-rac-portal']
    })
    
    // Also observe when prompt is opened
    const checkInterval = setInterval(() => {
      applyZIndexToDialogs()
    }, 100) // Check every 100ms when component is mounted
    
    return () => {
      observer.disconnect()
      clearInterval(checkInterval)
      const element = document.getElementById(styleId)
      if (element) {
        element.remove()
      }
    }
  }, [])

  // Ensure prompt dialog appears above modal by injecting CSS
  useEffect(() => {
    const styleId = 'prompt-z-index-override'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        /* Ensure prompt dialogs appear above modals */
        [data-radix-portal] > [role="dialog"] {
          z-index: 9999 !important;
        }
        [data-radix-portal] {
          z-index: 9999 !important;
        }
        /* Target common dialog/overlay classes */
        [data-state="open"][role="dialog"] {
          z-index: 9999 !important;
        }
        /* Target any overlay/dialog containers */
        [role="dialog"][aria-modal="true"] {
          z-index: 9999 !important;
        }
      `
      document.head.appendChild(style)
    }

    // Cleanup on unmount
    return () => {
      const style = document.getElementById(styleId)
      if (style) {
        style.remove()
      }
    }
  }, [])

  const showLevelsWarning = useMemo(() => {
    if (!locationId) {
      return false
    }

    const allItemsHaveLocation = items
      .map((_i) => {
        const item = itemsMap.get(_i.item_id)
        if (!item?.variant_id) {
          return true
        }

        if (!item.variant?.manage_inventory) {
          return true
        }

        return inventoryMap[item.variant_id]?.find(
          (l) => l.location_id === locationId
        )
      })
      .every(Boolean)

    return !allItemsHaveLocation
  }, [items, inventoryMap, locationId])

  useEffect(() => {
    const getInventoryMap = async () => {
      const ret: Record<string, InventoryLevelDTO[]> = {}

      if (!items.length) {
        return ret
      }

      ;(
        await Promise.all(
          items.map(async (_i) => {
            const item = itemsMap.get(_i.item_id)

            if (!item?.variant_id || !item?.product_id) {
              return undefined
            }
            return await sdk.admin.product.retrieveVariant(
              item.product_id,
              item.variant_id,
              { fields: "*inventory,*inventory.location_levels" }
            )
          })
        )
      )
        .filter((it): it is NonNullable<typeof it> => Boolean(it?.variant))
        .forEach((item) => {
          const variant = item.variant
          if (!variant) return
          // The variant response from retrieveVariant includes inventory array
          const inventory = (variant as any).inventory
          const levels = inventory?.[0]?.location_levels

          if (!levels) {
            return
          }

          ret[variant.id] = levels
        })

      return ret
    }

    getInventoryMap().then((map) => {
      setInventoryMap(map)
    })
  }, [items])

  const returnTotal = preview.return_requested_total

  const shippingTotal = useMemo(() => {
    const method = preview.shipping_methods.find(
      (sm) => !!sm.actions?.find((a) => a.action === "SHIPPING_ADD")
    )

    return method?.total || 0
  }, [preview.shipping_methods])

  return (
    <RouteFocusModal.Form
      form={form}
      onClose={(isSubmitSuccessful) => {
        if (!isSubmitSuccessful) {
          cancelReturnRequest()
        }
      }}
    >
      <KeyboundForm onSubmit={handleSubmit} className="flex h-full flex-col">
        <RouteFocusModal.Header />
        <RouteFocusModal.Body className="flex size-full justify-center overflow-y-auto">
          <div className="mt-16 w-[720px] max-w-[100%] px-4 md:p-0">
            <Heading level="h1">{t("orders.returns.create")}</Heading>
            <div className="mt-8 flex items-center justify-between">
              <Heading level="h2">{t("orders.returns.inbound")}</Heading>
              <StackedFocusModal id="items">
                <StackedFocusModal.Trigger asChild>
                  <a className="focus-visible:shadow-borders-focus transition-fg txt-compact-small-plus cursor-pointer text-blue-500 outline-none hover:text-blue-400">
                    {t("actions.addItems")}
                  </a>
                </StackedFocusModal.Trigger>
                <StackedFocusModal.Content>
                  <StackedFocusModal.Header />

                  <AddReturnItemsTable
                    items={order.items!}
                    selectedItems={items.map((i) => i.item_id)}
                    currencyCode={order.currency_code}
                    onSelectionChange={(s) => (selectedItems = s)}
                  />
                  <StackedFocusModal.Footer>
                    <div className="flex w-full items-center justify-end gap-x-4">
                      <div className="flex items-center justify-end gap-x-2">
                        <RouteFocusModal.Close asChild>
                          <Button
                            type="button"
                            variant="secondary"
                            size="small"
                          >
                            {t("actions.cancel")}
                          </Button>
                        </RouteFocusModal.Close>
                        <Button
                          key="submit-button"
                          type="submit"
                          variant="primary"
                          size="small"
                          role="button"
                          onClick={() => onItemsSelected()}
                        >
                          {t("actions.save")}
                        </Button>
                      </div>
                    </div>
                  </StackedFocusModal.Footer>
                </StackedFocusModal.Content>
              </StackedFocusModal>
            </div>
            {showPlaceholder && (
              <div
                style={{
                  background:
                    "repeating-linear-gradient(-45deg, rgb(212, 212, 216, 0.15), rgb(212, 212, 216,.15) 10px, transparent 10px, transparent 20px)",
                }}
                className="bg-ui-bg-field mt-4 block h-[56px] w-full rounded-lg border border-dashed"
              />
            )}
            {items
              .filter((item) => !!previewItemsMap.get(item.item_id))
              .map((item, index) => {
                const orderItem = itemsMap.get(item.item_id)
                const previewItem = previewItemsMap.get(item.item_id)
                if (!orderItem || !previewItem) return null
                
                return (
                <ReturnItem
                  key={item.id}
                  item={orderItem}
                  previewItem={previewItem}
                  currencyCode={order.currency_code}
                  form={form}
                  onRemove={() => {
                    const actionId = previewItems
                      .find((i) => i.id === item.item_id)
                      ?.actions?.find((a) => a.action === "RETURN_ITEM")?.id

                    if (actionId) {
                      removeReturnItem(actionId)
                    }
                  }}
                  onUpdate={(payload) => {
                    const action = previewItems
                      .find((i) => i.id === item.item_id)
                      ?.actions?.find((a) => a.action === "RETURN_ITEM")

                    if (action) {
                      updateReturnItem(
                        { ...payload, actionId: action.id },
                        {
                          onError: (error) => {
                            if (action.details?.quantity && payload.quantity) {
                              form.setValue(
                                `items.${index}.quantity`,
                                action.details?.quantity as number
                              )
                            }

                            toast.error(error.message)
                          },
                        }
                      )
                    }
                  }}
                  index={index}
                />
                )
              })}
            {!showPlaceholder && (
              <div className="mt-8 flex flex-col gap-y-4">
                {/* LOCATION*/}
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div>
                    <Form.Label>{t("orders.returns.location")}</Form.Label>
                    <Form.Hint className="!mt-1">
                      {t("orders.returns.locationHint")}
                    </Form.Hint>
                  </div>

                  <Form.Field
                    control={form.control}
                    name="location_id"
                    render={({ field: { value, onChange, ...field } }) => {
                      return (
                        <Form.Item>
                          <Form.Control>
                            <Combobox
                              value={value}
                              onChange={(v) => {
                                onChange(v)
                                if (v) {
                                  onLocationChange(v)
                                }
                              }}
                              {...field}
                              options={(stock_locations ?? []).map(
                                (stockLocation) => ({
                                  label: stockLocation.name,
                                  value: stockLocation.id,
                                })
                              )}
                            />
                          </Form.Control>
                        </Form.Item>
                      )
                    }}
                  />
                </div>

                {/* INBOUND SHIPPING*/}
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div>
                    <Form.Label>
                      {t("orders.returns.inboundShipping")}
                      <Text
                        size="small"
                        leading="compact"
                        className="text-ui-fg-muted ml-1 inline"
                      >
                        ({t("fields.optional")})
                      </Text>
                    </Form.Label>

                    <Form.Hint className="!mt-1">
                      {t("orders.returns.inboundShippingHint")}
                    </Form.Hint>
                  </div>

                  <Form.Field
                    control={form.control}
                    name="option_id"
                    render={({ field: { value, onChange, ...field } }) => {
                      return (
                        <Form.Item>
                          <Form.Control>
                            <Combobox
                              allowClear
                              value={value}
                              onChange={(v) => {
                                onChange(v)
                                onShippingOptionChange(v)
                              }}
                              {...field}
                              options={(shipping_options ?? [])
                                .filter(
                                  (so) =>
                                    (locationId
                                      ? so.service_zone.fulfillment_set!
                                          .location.id === locationId
                                      : true) &&
                                    !!so.rules.find(
                                      (r) =>
                                        r.attribute === "is_return" &&
                                        r.value === "true"
                                    )
                                )
                                .map((so) => ({
                                  label: so.name,
                                  value: so.id,
                                }))}
                              disabled={!locationId}
                              noResultsPlaceholder={
                                <ReturnShippingPlaceholder />
                              }
                            />
                          </Form.Control>
                        </Form.Item>
                      )
                    }}
                  />
                </div>
              </div>
            )}

            {showLevelsWarning && (
              <Alert variant="warning" dismissible className="mt-4 p-5">
                <div className="text-ui-fg-subtle txt-small pb-2 font-medium leading-[20px]">
                  {t("orders.returns.noInventoryLevel")}
                </div>
                <Text className="text-ui-fg-subtle txt-small leading-normal">
                  {t("orders.returns.noInventoryLevelDesc")}
                </Text>
              </Alert>
            )}

            {/* TOTALS SECTION*/}
            <div className="mt-8 border-y border-dotted py-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="txt-small text-ui-fg-subtle">
                  {t("orders.returns.returnTotal")}
                </span>
                <span className="txt-small text-ui-fg-subtle">
                  {getStylizedAmount(
                    returnTotal ? -1 * returnTotal : returnTotal,
                    order.currency_code
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="txt-small text-ui-fg-subtle">
                  {t("orders.returns.inboundShipping")}
                </span>
                <span className="txt-small text-ui-fg-subtle flex items-center">
                  {!isShippingPriceEdit && (
                    <IconButton
                      onClick={() => setIsShippingPriceEdit(true)}
                      variant="transparent"
                      className="text-ui-fg-muted"
                      disabled={showPlaceholder || !shippingOptionId}
                    >
                      <PencilSquare />
                    </IconButton>
                  )}
                  {isShippingPriceEdit ? (
                    <CurrencyInput
                      id="js-shipping-input"
                      onBlur={() => {
                        let actionId: string | undefined
                        let shippingOptionId: string | undefined

                        preview.shipping_methods.forEach((s) => {
                          if (s.actions) {
                            for (const a of s.actions) {
                              if (a.action === "SHIPPING_ADD") {
                                actionId = a.id
                                shippingOptionId = s.shipping_option_id || undefined
                              }
                            }
                          }
                        })

                        if (actionId && shippingOptionId) {
                          updateReturnShipping({
                            actionId,
                            shipping_option_id: shippingOptionId,
                            custom_amount: customShippingAmount.float ?? undefined,
                          })
                        }
                        setIsShippingPriceEdit(false)
                      }}
                      symbol={
                        currencies[order.currency_code.toUpperCase()]
                          .symbol_native
                      }
                      code={order.currency_code}
                      onValueChange={(_value, _name, values) =>
                        setCustomShippingAmount({
                          value: values?.value || "",
                          float: values?.float || null,
                        })
                      }
                      value={customShippingAmount.value}
                      disabled={showPlaceholder}
                    />
                  ) : (
                    getStylizedAmount(shippingTotal, order.currency_code)
                  )}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-dotted pt-4">
                <span className="txt-small font-medium">
                  {t("orders.returns.estDifference")}
                </span>
                <span className="txt-small font-medium">
                  {getStylizedAmount(
                    preview.summary.pending_difference,
                    order.currency_code
                  )}
                </span>
              </div>
            </div>

            {/* SEND NOTIFICATION*/}
            <div className="bg-ui-bg-field mt-8 rounded-lg border py-2 pl-2 pr-4">
              <Form.Field
                control={form.control}
                name="send_notification"
                render={({ field: { onChange, value, ...field } }) => {
                  return (
                    <Form.Item>
                      <div className="flex items-center">
                        <Form.Control className="mr-4 self-start">
                          <Switch
                            className="mt-[2px]"
                            checked={!!value}
                            onCheckedChange={onChange}
                            {...field}
                          />
                        </Form.Control>
                        <div className="block">
                          <Form.Label>
                            {t("orders.returns.sendNotification")}
                          </Form.Label>
                          <Form.Hint className="!mt-1">
                            {t("orders.returns.sendNotificationHint")}
                          </Form.Hint>
                        </div>
                      </div>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )
                }}
              />
            </div>

            <div className="p-8" />
          </div>
        </RouteFocusModal.Body>
        <RouteFocusModal.Footer>
          <div className="flex w-full items-center justify-end gap-x-4">
            <div className="flex items-center justify-end gap-x-2">
              <RouteFocusModal.Close asChild>
                <Button type="button" variant="secondary" size="small">
                  {t("orders.returns.cancel.title")}
                </Button>
              </RouteFocusModal.Close>
              <Button
                key="submit-button"
                type="submit"
                variant="primary"
                size="small"
                isLoading={isRequestLoading}
                onClick={handleConfirmClick}
              >
                {t("orders.returns.confirm")}
              </Button>
            </div>
          </div>
        </RouteFocusModal.Footer>
      </KeyboundForm>

      {/* Custom Confirmation Dialog - Rendered outside modal using Portal */}
      {showConfirmDialog &&
        createPortal(
          <div 
            className="fixed inset-0 z-[10000] flex items-center justify-center"
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => {
              // Close if clicking the backdrop
              if (e.target === e.currentTarget) {
                setShowConfirmDialog(false)
              }
            }}
          >
            <div 
              className="fixed inset-0 bg-black/50"
              style={{ pointerEvents: 'auto' }}
            />
            <div 
              className="relative bg-white rounded-lg shadow-lg p-6 w-full max-w-md z-[10001] mx-4"
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <Heading level="h2" className="mb-2">
                {t("general.areYouSure")}
              </Heading>
              <Text className="text-sm text-gray-600 mb-6">
                {t("orders.returns.confirmText")}
              </Text>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowConfirmDialog(false)
                  }}
                >
                  {t("actions.cancel")}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="small"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleConfirmReturn()
                  }}
                  isLoading={isConfirming}
                >
                  {t("actions.continue")}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </RouteFocusModal.Form>
  )
}
