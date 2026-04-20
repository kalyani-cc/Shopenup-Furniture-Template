import { RouteFocusModal } from "../../../components/modals/route-focus-modal"
import { usePaymentProviders } from "../../../hooks/api/payments"
import { useStore } from "../../../hooks/api/store"
import { CurrencyInfo, currencies } from "../../../lib/data/currencies"
import { CreateRegionForm } from "./components/create-region-form"

export const RegionCreate = () => {
  const { store, isPending: isLoading, isError, error } = useStore()

  const storeCurrencies = ((store?.supported_currencies ?? [])
    .map((c) => currencies[c.currency_code.toUpperCase()])
    .filter((c): c is CurrencyInfo => Boolean(c)))

  // Fallback so region currency dropdown is always usable even if store currencies are not populated.
  const currencyOptions = storeCurrencies.length
    ? storeCurrencies
    : Object.values(currencies)

  const { payment_providers: paymentProviders = [] } = usePaymentProviders({
    is_enabled: true,
  })

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal>
      {!isLoading && store && (
        <CreateRegionForm
          currencies={currencyOptions}
          paymentProviders={paymentProviders}
        />
      )}
    </RouteFocusModal>
  )
}
