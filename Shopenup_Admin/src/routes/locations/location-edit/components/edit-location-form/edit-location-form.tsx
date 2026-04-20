import { zodResolver } from "@hookform/resolvers/zod"
import { HttpTypes } from "@shopenup/types"
import { Button, Input, toast } from "@shopenup/ui"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import * as zod from "zod"

import { Form } from "../../../../../components/common/form"
import { CountrySelect } from "../../../../../components/inputs/country-select"
import { ProvinceSelect } from "../../../../../components/inputs/province-select"
import { RouteDrawer, useRouteModal } from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import { useUpdateStockLocation } from "../../../../../hooks/api/stock-locations"
import { sdk } from "../../../../../lib/client"

type EditLocationFormProps = {
  location: HttpTypes.AdminStockLocation
}

const EditLocationSchema = zod.object({
  name: zod.string().min(1),
  address: zod.object({
    address_1: zod.string().min(1),
    address_2: zod.string().optional(),
    country_code: zod.string().min(2).max(2),
    city: zod.string().optional(),
    postal_code: zod.string().optional(),
    province: zod.string().optional(),
    company: zod.string().optional(),
    phone: zod.string().optional(), // TODO: Add validation
  }),
})

export const EditLocationForm = ({ location }: EditLocationFormProps) => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()

  const form = useForm<zod.infer<typeof EditLocationSchema>>({
    defaultValues: {
      name: location.name,
      address: {
        address_1: location.address?.address_1 || "",
        address_2: location.address?.address_2 || "",
        city: location.address?.city || "",
        company: location.address?.company || "",
        country_code: location.address?.country_code || "",
        phone: location.address?.phone || "",
        postal_code: location.address?.postal_code || "",
        province: location.address?.province || "",
      },
    },
    resolver: zodResolver(EditLocationSchema),
  })

  const { mutateAsync, isPending } = useUpdateStockLocation(location.id)

  const handleSubmit = form.handleSubmit(async (values) => {
    const { name, address } = values

    await mutateAsync(
      {
        name: name,
        address: address,
      },
      {
        onSuccess: async () => {
          // Create Shiprocket pickup location if it doesn't exist yet
          // This allows linking existing Shopopenup addresses to Shiprocket
          try {
            const response = await sdk.client.fetch<Response>(
              `/admin/stock-locations/${location.id}/shiprocket-pickup`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
              }
            )

            if (!(response as Response).ok) {
              const errorData = await response.json().catch(() => ({}))
              // If pickup already exists, that's fine - just log it
              if (errorData.message?.includes('already exists')) {
              } else {
                console.warn('[Shiprocket] Failed to create/check pickup location:', errorData)
              }
            } else {
              const result = await response.json()
              if (result.action === 'created') {
              } else if (result.action === 'skipped') {
              }
            }
          } catch (error: any) {
            console.warn('[Shiprocket] Error creating/checking pickup location:', error)
            // Don't show error to user - stock location update succeeded
          }

          toast.success(t("stockLocations.edit.successToast"))
          handleSuccess()
        },
        onError: (e) => {
          toast.error(e.message)
        },
      }
    )
  })

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <RouteDrawer.Body className="flex flex-col gap-y-8 overflow-y-auto">
          <div className="grid grid-cols-1 gap-4">
            <Form.Field
              control={form.control}
              name="name"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label>{t("fields.name")}</Form.Label>
                    <Form.Control>
                      <Input size="small" {...field} disabled />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
            <Form.Field
              control={form.control}
              name="address.address_1"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label>{t("fields.address")}</Form.Label>
                    <Form.Control>
                      <Input size="small" {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
            <Form.Field
              control={form.control}
              name="address.address_2"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label optional>{t("fields.address2")}</Form.Label>
                    <Form.Control>
                      <Input size="small" {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
            <Form.Field
              control={form.control}
              name="address.postal_code"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label optional>{t("fields.postalCode")}</Form.Label>
                    <Form.Control>
                      <Input size="small" {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
            <Form.Field
              control={form.control}
              name="address.city"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label optional>{t("fields.city")}</Form.Label>
                    <Form.Control>
                      <Input size="small" {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
            <Form.Field
              control={form.control}
              name="address.country_code"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label>{t("fields.country")}</Form.Label>
                    <Form.Control>
                      <CountrySelect {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
            <Form.Field
              control={form.control}
              name="address.province"
              render={({ field }) => {
                const countryCode = form.watch("address.country_code")
                return (
                  <Form.Item>
                    <Form.Label optional>{t("fields.state")}</Form.Label>
                    <Form.Control>
                      <ProvinceSelect 
                        {...field} 
                        country_code={countryCode}
                        valueAs="iso_2"
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
            <Form.Field
              control={form.control}
              name="address.company"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label optional>{t("fields.company")}</Form.Label>
                    <Form.Control>
                      <Input size="small" {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
            <Form.Field
              control={form.control}
              name="address.phone"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label optional>{t("fields.phone")}</Form.Label>
                    <Form.Control>
                      <Input size="small" {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
          </div>
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button size="small" type="submit" isLoading={isPending}>
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}
