import { HttpTypes } from "@shopenup/types"
import { Button, Input, Select } from "@shopenup/ui"
import { useTranslation } from "react-i18next"
import * as zod from "zod"
import { Form } from "../../../../../components/common/form"
import { CountrySelect } from "../../../../../components/inputs/country-select"
import { RouteDrawer, useRouteModal } from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import {
  FormExtensionZone,
  useExtendableForm,
} from "../../../../../dashboard-app"
import { useUpdateProduct } from "../../../../../hooks/api/products"
import { useExtension } from "../../../../../providers/extension-provider"

type ProductAttributesFormProps = {
  product: HttpTypes.AdminProduct
}

const dimension = zod
  .union([zod.string(), zod.number()])
  .transform((value) => {
    if (value === "") {
      return null
    }
    return Number(value)
  })
  .refine((value) => value !== null && value !== undefined, {
    message: "This field is required",
  })

const ProductAttributesSchema = zod.object({
  weight: dimension,
  weight_unit: zod.enum(["kg", "mg", "g"], {
    errorMap: () => ({ message: "This field is required" }),
  }),
  length: dimension,
  width: dimension,
  height: dimension,
  mid_code: zod.string().min(1, "This field is required"),
  hs_code: zod.string().min(1, "This field is required"),
  origin_country: zod.string().min(1, "This field is required"),
})

export const ProductAttributesForm = ({
  product,
}: ProductAttributesFormProps) => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()
  const { getFormConfigs, getFormFields } = useExtension()

  const configs = getFormConfigs("product", "attributes")
  const fields = getFormFields("product", "attributes")

  // Convert weight from kg to display unit
  const getDisplayWeight = (weightInKg: number | null, unit: string): number | null => {
    if (!weightInKg) return null
    switch (unit) {
      case "g":
        return weightInKg * 1000
      case "mg":
        return weightInKg * 1000000
      case "kg":
      default:
        return weightInKg
    }
  }

  const preferredUnit = (product.metadata as any)?.weight_unit || "kg"
  const displayWeight = product.weight
    ? getDisplayWeight(product.weight, preferredUnit)
    : null

  const form = useExtendableForm({
    defaultValues: {
      height: product.height ? product.height : undefined,
      width: product.width ? product.width : undefined,
      length: product.length ? product.length : undefined,
      weight: displayWeight ?? undefined,
      weight_unit: preferredUnit,
      mid_code: product.mid_code || "",
      hs_code: product.hs_code || "",
      origin_country: product.origin_country || "",
    },
    schema: ProductAttributesSchema,
    configs: configs,
    data: product,
  })

  const { mutateAsync, isPending } = useUpdateProduct(product.id)

  const handleSubmit = form.handleSubmit(async (data) => {
    // Convert weight to kg based on selected unit
    let weightInKg: number | undefined = undefined
    if (data.weight !== null && data.weight !== undefined) {
      switch (data.weight_unit) {
        case "g":
          weightInKg = data.weight / 1000
          break
        case "mg":
          weightInKg = data.weight / 1000000
          break
        case "kg":
        default:
          weightInKg = data.weight
          break
      }
    }

    await mutateAsync(
      {
        weight: weightInKg,
        length: data.length ?? undefined,
        width: data.width ?? undefined,
        height: data.height ?? undefined,
        mid_code: data.mid_code || undefined,
        hs_code: data.hs_code || undefined,
        origin_country: data.origin_country || undefined,
        metadata: {
          ...((product.metadata as Record<string, any>) || {}),
          weight_unit: data.weight_unit,
        },
      },
      {
        onSuccess: () => {
          handleSuccess()
        },
      }
    )
  })

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm onSubmit={handleSubmit} className="flex h-full flex-col">
        <RouteDrawer.Body>
          <div className="flex h-full flex-col gap-y-8">
            <div className="flex flex-col gap-y-4">
              <Form.Field
                control={form.control}
                name="width"
                render={({ field: { onChange, value, ...field } }) => {
                  return (
                    <Form.Item>
                      <Form.Label>{t("fields.width")}</Form.Label>
                      <Form.Control>
                        <Input
                          type="number"
                          min={0}
                          value={value || ""}
                          onChange={(e) => {
                            const value = e.target.value

                            if (value === "") {
                              onChange(null)
                            } else {
                              onChange(parseFloat(value))
                            }
                          }}
                          {...field}
                        />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )
                }}
              />
              <Form.Field
                control={form.control}
                name="height"
                render={({ field: { onChange, value, ...field } }) => {
                  return (
                    <Form.Item>
                      <Form.Label>{t("fields.height")}</Form.Label>
                      <Form.Control>
                        <Input
                          type="number"
                          min={0}
                          value={value || ""}
                          onChange={(e) => {
                            const value = e.target.value

                            if (value === "") {
                              onChange(null)
                            } else {
                              onChange(Number(value))
                            }
                          }}
                          {...field}
                        />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )
                }}
              />
              <Form.Field
                control={form.control}
                name="length"
                render={({ field: { onChange, value, ...field } }) => {
                  return (
                    <Form.Item>
                      <Form.Label>{t("fields.length")}</Form.Label>
                      <Form.Control>
                        <Input
                          type="number"
                          min={0}
                          value={value || ""}
                          onChange={(e) => {
                            const value = e.target.value

                            if (value === "") {
                              onChange(null)
                            } else {
                              onChange(Number(value))
                            }
                          }}
                          {...field}
                        />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )
                }}
              />
              <Form.Field
                control={form.control}
                name="weight"
                render={({ field: { onChange, value, ...field } }) => {
                  return (
                    <Form.Item>
                      <Form.Label>
                        {t("fields.weight")} (with included package weight)
                      </Form.Label>
                      <Form.Control>
                        <div className="flex gap-x-2">
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            value={value || ""}
                            onChange={(e) => {
                              const value = e.target.value

                              if (value === "") {
                                onChange(null)
                              } else {
                                onChange(Number(value))
                              }
                            }}
                            className="flex-1"
                            {...field}
                          />
                          <Form.Field
                            control={form.control}
                            name="weight_unit"
                            render={({ field: unitField }) => {
                              return (
                                <Select
                                  {...unitField}
                                  onValueChange={unitField.onChange}
                                >
                                  <Select.Trigger className="w-[100px]">
                                    <Select.Value />
                                  </Select.Trigger>
                                  <Select.Content>
                                    <Select.Item value="kg">kg</Select.Item>
                                    <Select.Item value="g">g</Select.Item>
                                    <Select.Item value="mg">mg</Select.Item>
                                  </Select.Content>
                                </Select>
                              )
                            }}
                          />
                        </div>
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )
                }}
              />
              <Form.Field
                control={form.control}
                name="mid_code"
                render={({ field }) => {
                  return (
                    <Form.Item>
                      <Form.Label>{t("fields.midCode")}</Form.Label>
                      <Form.Control>
                        <Input {...field} />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )
                }}
              />
              <Form.Field
                control={form.control}
                name="hs_code"
                render={({ field }) => {
                  return (
                    <Form.Item>
                      <Form.Label>{t("fields.hsCode")}</Form.Label>
                      <Form.Control>
                        <Input {...field} />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )
                }}
              />
              <Form.Field
                control={form.control}
                name="origin_country"
                render={({ field }) => {
                  return (
                    <Form.Item>
                      <Form.Label>{t("fields.countryOfOrigin")}</Form.Label>
                      <Form.Control>
                        <CountrySelect {...field} />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )
                }}
              />
              <FormExtensionZone fields={fields} form={form} />
            </div>
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
