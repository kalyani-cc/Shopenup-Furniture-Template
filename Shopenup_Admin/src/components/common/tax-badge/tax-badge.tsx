import { TaxExclusive, TaxInclusive } from "@shopenup/icons"
import { Tooltip } from "@shopenup/ui"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"

type IncludesTaxTooltipProps = {
  includesTax?: boolean
}

export const IncludesTaxTooltip = ({
  includesTax,
}: IncludesTaxTooltipProps) => {
  const { t } = useTranslation()

  // Fix z-index issue: Ensure tooltips appear above RouteFocusModal (z-index 100)
  useEffect(() => {
    const styleId = 'tax-tooltip-zindex-fix'
    let styleElement = document.getElementById(styleId)
    
    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = styleId
      document.head.appendChild(styleElement)
    }
    
    // Ensure tooltips appear above modals - RouteFocusModal has z-index 100
    styleElement.textContent = `
      /* Ensure tooltips appear above modals */
      [data-radix-tooltip-content],
      [data-radix-tooltip-portal],
      [role="tooltip"],
      body > div[data-radix-portal] [role="tooltip"],
      body > div[data-radix-portal] [data-radix-tooltip-content],
      /* Target any tooltip-related elements */
      [class*="Tooltip"],
      [class*="tooltip"] {
        z-index: 150 !important;
      }
      
      /* Target portal containers for tooltips */
      body > div[data-radix-portal]:has([role="tooltip"]),
      body > div[data-radix-portal]:has([data-radix-tooltip-content]) {
        z-index: 150 !important;
      }
    `
    
    // Use MutationObserver to ensure dynamically created tooltips get correct z-index
    const applyZIndexToTooltips = () => {
      const tooltips = document.querySelectorAll(
        '[data-radix-tooltip-content], [role="tooltip"], body > div[data-radix-portal] [role="tooltip"]'
      )
      
      tooltips.forEach((tooltip) => {
        const element = tooltip as HTMLElement
        const currentZIndex = window.getComputedStyle(element).zIndex
        const zIndexNum = parseInt(currentZIndex) || 0
        
        // If z-index is less than 150, update it
        if (zIndexNum < 150) {
          element.style.zIndex = '150'
        }
      })
      
      // Also check for portal containers
      const portals = document.querySelectorAll('body > div[data-radix-portal]')
      portals.forEach((portal) => {
        const portalElement = portal as HTMLElement
        const hasTooltip = portalElement.querySelector('[role="tooltip"], [data-radix-tooltip-content]')
        if (hasTooltip) {
          portalElement.style.zIndex = '150'
        }
      })
    }
    
    // Apply immediately and observe for changes
    applyZIndexToTooltips()
    
    const observer = new MutationObserver(() => {
      setTimeout(() => {
        applyZIndexToTooltips()
      }, 0)
    })
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'data-radix-tooltip-content', 'data-radix-portal']
    })
    
    // Also check periodically when component is mounted
    const checkInterval = setInterval(() => {
      applyZIndexToTooltips()
    }, 100)
    
    return () => {
      observer.disconnect()
      clearInterval(checkInterval)
      const element = document.getElementById(styleId)
      if (element) {
        element.remove()
      }
    }
  }, [])

  return (
    <Tooltip
      maxWidth={999}
      content={
        includesTax
          ? t("general.includesTaxTooltip")
          : t("general.excludesTaxTooltip")
      }
    >
      {includesTax ? (
        <TaxInclusive className="text-ui-fg-muted shrink-0" />
      ) : (
        <TaxExclusive className="text-ui-fg-muted shrink-0" />
      )}
    </Tooltip>
  )
}
