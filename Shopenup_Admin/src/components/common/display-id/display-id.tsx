import { useTranslation } from "react-i18next"
import { useState } from "react"
import copy from "copy-to-clipboard"

import { clx, toast, Tooltip } from "@shopenup/ui"

type DisplayIdProps = {
  id: string
  className?: string
  maskAsPayment?: boolean
}

function DisplayId({ id, className, maskAsPayment = false }: DisplayIdProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const onClick = () => {
    copy(id)
    toast.success(t("actions.idCopiedToClipboard"))
  }

  const formatDisplayId = () => {
    if (maskAsPayment) {
      // Extract prefix from payment ID (e.g., "pay_cl" or "pay_bx")
      // Payment IDs follow pattern: pay_XX... where XX is typically 2 characters
      const underscoreIndex = id.indexOf("_")
      let prefix = "pay_"
      
      if (underscoreIndex !== -1 && id.length > underscoreIndex + 2) {
        // Extract pay_ + next 2 characters (e.g., "pay_cl" or "pay_bx")
        prefix = id.substring(0, underscoreIndex + 3)
      } else if (id.startsWith("pay_")) {
        // Fallback: if it starts with pay_ but doesn't match expected pattern
        prefix = id.substring(0, Math.min(6, id.length))
      }
      
      // Mask payment ID: show extracted prefix, mask middle with *, show last 3 characters
      const lastThree = id.slice(-3)
      // Calculate how many characters to mask (original length minus prefix length minus last 3)
      const originalLength = id.length
      const prefixLength = prefix.length
      const maskedLength = Math.max(0, originalLength - prefixLength - 3)
      const maskedChars = "*".repeat(maskedLength)
      return `${prefix}${maskedChars}${lastThree}`
    }
    return id.slice(-7)
  }

  return (
    <Tooltip maxWidth={260} content={id} open={open} onOpenChange={setOpen}>
      <span onClick={onClick} className={clx("cursor-pointer", className)}>
        #{formatDisplayId()}
      </span>
    </Tooltip>
  )
}

export default DisplayId
