import { PencilSquare } from "@shopenup/icons"
import { HttpTypes } from "@shopenup/types"
import { Container, Heading, Text } from "@shopenup/ui"
import { useTranslation } from "react-i18next"
import { ActionMenu } from "../../../../../components/common/action-menu"
import { SectionRow } from "../../../../../components/common/section"
import { getFormattedCountry } from "../../../../../lib/addresses"
import { useExtension } from "../../../../../providers/extension-provider"

type ProductAttributeSectionProps = {
  product: HttpTypes.AdminProduct
}

export const ProductAttributeSection = ({
  product,
}: ProductAttributeSectionProps) => {
  const { t } = useTranslation()
  const { getDisplays } = useExtension()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("products.attributes")}</Heading>
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  label: t("actions.edit"),
                  to: "attributes",
                  icon: <PencilSquare />,
                },
              ],
            },
          ]}
        />
      </div>
      <SectionRow
        title={
          <>
            {t("fields.height")} <span className="text-ui-tag-red-text">*</span>
          </>
        }
        value={
          product.height ? (
            product.height
          ) : (
            <Text size="small" leading="compact" className="text-ui-tag-red-text italic">
              Required
            </Text>
          )
        }
      />
      <SectionRow
        title={
          <>
            {t("fields.width")} <span className="text-ui-tag-red-text">*</span>
          </>
        }
        value={
          product.width ? (
            product.width
          ) : (
            <Text size="small" leading="compact" className="text-ui-tag-red-text italic">
              Required
            </Text>
          )
        }
      />
      <SectionRow
        title={
          <>
            {t("fields.length")} <span className="text-ui-tag-red-text">*</span>
          </>
        }
        value={
          product.length ? (
            product.length
          ) : (
            <Text size="small" leading="compact" className="text-ui-tag-red-text italic">
              Required
            </Text>
          )
        }
      />
      <SectionRow
        title={
          <>
            {t("fields.weight")} (with included package weight){" "}
            <span className="text-ui-tag-red-text">*</span>
          </>
        }
        value={
          product.weight ? (() => {
            const weightInKg = product.weight
            const preferredUnit = (product.metadata as any)?.weight_unit || "kg"
            let displayWeight: number
            let displayUnit: string
            
            switch (preferredUnit) {
              case "g":
                displayWeight = weightInKg * 1000
                displayUnit = "g"
                break
              case "mg":
                displayWeight = weightInKg * 1000000
                displayUnit = "mg"
                break
              case "kg":
              default:
                displayWeight = weightInKg
                displayUnit = "kg"
                break
            }
            
            return `${displayWeight} ${displayUnit}`
          })() : (
            <Text size="small" leading="compact" className="text-ui-tag-red-text italic">
              Required
            </Text>
          )
        }
      />
      <SectionRow
        title={
          <>
            {t("fields.midCode")} <span className="text-ui-tag-red-text">*</span>
          </>
        }
        value={
          product.mid_code ? (
            product.mid_code
          ) : (
            <Text size="small" leading="compact" className="text-ui-tag-red-text italic">
              Required
            </Text>
          )
        }
      />
      <SectionRow
        title={
          <>
            {t("fields.hsCode")} <span className="text-ui-tag-red-text">*</span>
          </>
        }
        value={
          product.hs_code ? (
            product.hs_code
          ) : (
            <Text size="small" leading="compact" className="text-ui-tag-red-text italic">
              Required
            </Text>
          )
        }
      />
      <SectionRow
        title={
          <>
            {t("fields.countryOfOrigin")}{" "}
            <span className="text-ui-tag-red-text">*</span>
          </>
        }
        value={
          product.origin_country ? (
            getFormattedCountry(product.origin_country)
          ) : (
            <Text size="small" leading="compact" className="text-ui-tag-red-text italic">
              Required
            </Text>
          )
        }
      />
      {getDisplays("product", "attributes").map((Component, i) => {
        return <Component key={i} data={product} />
      })}
    </Container>
  )
}
