import {
  CurrencyInput,
  DatePicker,
  Heading,
  Input,
  RadioGroup,
  Select,
  Text,
  Textarea,
} from "@shopenup/ui"
import { useEffect } from "react"
import { UseFormReturn, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Form } from "../../../../../components/common/form"
import { useStore } from "../../../../../hooks/api/store"
import {
  currencies,
  getCurrencySymbol,
} from "../../../../../lib/data/currencies"

type CreateCampaignFormFieldsProps = {
  form: UseFormReturn<any>
  fieldScope?: string
}

export const CreateCampaignFormFields = ({ form, fieldScope = "" }: CreateCampaignFormFieldsProps) => {
  const { t } = useTranslation()
  const { store } = useStore()

  // Fix z-index issue: Ensure DatePicker calendar popover appears above RouteFocusModal (z-index 100)
  useEffect(() => {
    const styleId = 'campaign-datepicker-zindex-fix'
    let styleElement = document.getElementById(styleId)
    
    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = styleId
      document.head.appendChild(styleElement)
    }
    
    // Ensure DatePicker popover/calendar/time picker appears above RouteFocusModal (z-index 100)
    styleElement.textContent = `
      /* Ensure DatePicker popover/calendar/time picker appears above modals */
      [data-rac-popover],
      [data-rac-popover-content],
      [data-radix-popover-content],
      [data-rac-calendar],
      [data-radix-calendar],
      [role="dialog"][data-rac-dialog],
      [data-rac-dialog-overlay],
      [data-rac-popover-overlay],
      [data-radix-popover-overlay],
      /* Target React Aria Components popover */
      [data-rac-popover-trigger] + [data-rac-popover-content],
      /* Target any portal containers */
      body > [data-rac-popover-content],
      body > [data-radix-popover-content],
      body > [data-rac-calendar],
      body > [data-radix-calendar],
      /* Target React Aria DatePicker specific elements */
      [data-rac-date-picker],
      [data-rac-date-field],
      /* Target time picker elements specifically */
      [data-rac-time-field],
      [data-rac-time-picker],
      [data-radix-time-field],
      [data-radix-time-picker],
      [role="group"][aria-label*="time"],
      [role="group"][aria-label*="Time"],
      [aria-label*="hour"],
      [aria-label*="minute"],
      [aria-label*="Hour"],
      [aria-label*="Minute"],
      /* Ensure popover wrapper/container also has high z-index */
      [data-rac-popover-portal],
      [data-radix-popover-portal],
      [data-rac-popover-root],
      /* Target any element with popover/calendar/time-related classes */
      [class*="popover"],
      [class*="Popover"],
      [class*="calendar"],
      [class*="Calendar"],
      [class*="DatePicker"],
      [class*="date-picker"],
      [class*="TimePicker"],
      [class*="time-picker"],
      [class*="TimeField"],
      [class*="time-field"] {
        z-index: 150 !important;
      }
      
      /* Specifically target elements that are direct children of body (portals) */
      body > div[style*="z-index"],
      body > div[data-radix-portal],
      body > div[data-rac-portal] {
        z-index: 150 !important;
      }
      
      /* Prevent time picker from closing immediately - ensure it stays open */
      [data-rac-popover-content]:has([data-rac-time-field]),
      [data-rac-popover-content]:has([data-rac-time-picker]),
      [data-radix-popover-content]:has([data-radix-time-field]),
      [data-radix-popover-content]:has([data-radix-time-picker]) {
        z-index: 151 !important;
        pointer-events: auto !important;
      }
    `
    
    // Use MutationObserver to ensure dynamically created date picker popovers get correct z-index
    const applyZIndexToDatePickers = () => {
      const datePickers = document.querySelectorAll(
        '[data-rac-popover], [data-rac-popover-content], [data-radix-popover-content], [data-rac-calendar], [data-radix-calendar], [data-rac-date-picker], [data-rac-date-field], [data-rac-time-field], [data-rac-time-picker], [data-radix-time-field], [data-radix-time-picker], [role="group"][aria-label*="time"], [role="group"][aria-label*="Time"], body > div[data-radix-portal], body > div[data-rac-portal]'
      )
      
      datePickers.forEach((element) => {
        const el = element as HTMLElement
        
        // Check if it's a portal container
        if (el.hasAttribute('data-radix-portal') || el.hasAttribute('data-rac-portal')) {
          const hasDatePicker = el.querySelector('[data-rac-popover-content], [data-radix-popover-content], [data-rac-calendar], [data-radix-calendar], [data-rac-date-picker], [data-rac-time-field], [data-rac-time-picker]')
          if (hasDatePicker) {
            el.style.zIndex = '150'
            // If it contains time picker, give it even higher z-index
            const hasTimePicker = el.querySelector('[data-rac-time-field], [data-rac-time-picker], [data-radix-time-field], [data-radix-time-picker], [role="group"][aria-label*="time"]')
            if (hasTimePicker) {
              el.style.zIndex = '151'
              el.style.pointerEvents = 'auto'
            }
          }
          return
        }
        
        // Check if it's a time picker element
        const isTimePicker = el.hasAttribute('data-rac-time-field') || 
                            el.hasAttribute('data-rac-time-picker') || 
                            el.hasAttribute('data-radix-time-field') || 
                            el.hasAttribute('data-radix-time-picker') ||
                            (el.getAttribute('role') === 'group' && el.getAttribute('aria-label')?.toLowerCase().includes('time'))
        
        // For date picker elements themselves
        const currentZIndex = window.getComputedStyle(el).zIndex
        const zIndexNum = parseInt(currentZIndex) || 0
        
        // If z-index is less than 150 (or 151 for time pickers), update it
        if (isTimePicker) {
          if (zIndexNum < 151) {
            el.style.zIndex = '151'
            el.style.pointerEvents = 'auto'
          }
        } else {
          if (zIndexNum < 150) {
            el.style.zIndex = '150'
          }
        }
      })
      
      // Also check for portal containers
      const portals = document.querySelectorAll('body > div[data-radix-portal], body > div[data-rac-portal]')
      portals.forEach((portal) => {
        const portalElement = portal as HTMLElement
        const hasDatePicker = portalElement.querySelector('[data-rac-popover-content], [data-radix-popover-content], [data-rac-calendar], [data-radix-calendar], [data-rac-date-picker], [data-rac-date-field], [data-rac-time-field], [data-rac-time-picker]')
        if (hasDatePicker) {
          const hasTimePicker = portalElement.querySelector('[data-rac-time-field], [data-rac-time-picker], [data-radix-time-field], [data-radix-time-picker], [role="group"][aria-label*="time"]')
          if (hasTimePicker) {
            portalElement.style.zIndex = '151'
            portalElement.style.pointerEvents = 'auto'
          } else {
            portalElement.style.zIndex = '150'
          }
        }
      })
    }
    
    // Apply immediately and observe for changes
    applyZIndexToDatePickers()
    
    // Intercept popover close events to prevent time picker from closing immediately
    const interceptPopoverClose = () => {
      const popovers = document.querySelectorAll('[data-rac-popover-content], [data-radix-popover-content]')
      popovers.forEach((popover) => {
        const popoverEl = popover as HTMLElement
        const hasTimePicker = popoverEl.querySelector('[data-rac-time-field], [data-rac-time-picker], [data-radix-time-field], [data-radix-time-picker], [role="group"][aria-label*="time"]')
        
        if (hasTimePicker) {
          // Prevent any close handlers
          const originalOnClick = popoverEl.onclick
          popoverEl.onclick = (e) => {
            e.stopPropagation()
            e.stopImmediatePropagation()
            if (originalOnClick) {
              originalOnClick.call(popoverEl, e)
            }
          }
          
          // Override any data-state changes that might close it
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.type === 'attributes' && mutation.attributeName === 'data-state') {
                const newState = popoverEl.getAttribute('data-state')
                const timeSinceOpen = Date.now() - timePickerOpenTime
                if (newState === 'closed' && timeSinceOpen < TIME_PICKER_MIN_OPEN_TIME) {
                  // Prevent closing if it was just opened
                  popoverEl.setAttribute('data-state', 'open')
                }
              }
            })
          })
          
          observer.observe(popoverEl, {
            attributes: true,
            attributeFilter: ['data-state']
          })
        }
      })
    }
    
    const observer = new MutationObserver(() => {
      setTimeout(() => {
        applyZIndexToDatePickers()
        interceptPopoverClose()
      }, 0)
    })
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'data-rac-popover-content', 'data-radix-popover-content', 'data-rac-calendar', 'data-radix-calendar', 'data-rac-time-field', 'data-rac-time-picker', 'data-radix-time-field', 'data-radix-time-picker', 'data-radix-portal', 'data-rac-portal', 'role', 'aria-label']
    })
    
    // Also check periodically when component is mounted
    const checkInterval = setInterval(() => {
      applyZIndexToDatePickers()
      interceptPopoverClose()
    }, 100)
    
    // Initial intercept
    setTimeout(() => {
      interceptPopoverClose()
    }, 100)
    
    // Track when time picker opens to prevent immediate closing
    let timePickerOpenTime = 0
    const TIME_PICKER_MIN_OPEN_TIME = 300 // Minimum 300ms before allowing close
    
    // Monitor when time picker opens
    const checkTimePickerOpen = () => {
      const timePickers = document.querySelectorAll('[data-rac-time-field], [data-rac-time-picker], [data-radix-time-field], [data-radix-time-picker], [role="group"][aria-label*="time"]')
      if (timePickers.length > 0) {
        timePickerOpenTime = Date.now()
      }
    }
    
    // Check periodically for time picker
    const timePickerCheckInterval = setInterval(() => {
      checkTimePickerOpen()
    }, 50)
    
    // Prevent time picker from closing when clicking inside it or on the clock icon
    const handleTimePickerClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const timePicker = target.closest('[data-rac-time-field], [data-rac-time-picker], [data-radix-time-field], [data-radix-time-picker], [role="group"][aria-label*="time"], [role="group"][aria-label*="Time"], [aria-label*="hour"], [aria-label*="minute"], [aria-label*="Hour"], [aria-label*="Minute"]')
      
      // Also check if clicking on clock icon or time-related buttons
      const isClockIcon = target.closest('button[aria-label*="time"], button[aria-label*="Time"], [class*="clock"], [class*="Clock"], svg[class*="clock"], svg[class*="Clock"]')
      
      // Check if clicking on popover that contains time picker
      const popoverContent = target.closest('[data-rac-popover-content], [data-radix-popover-content]')
      const hasTimePicker = popoverContent?.querySelector('[data-rac-time-field], [data-rac-time-picker], [data-radix-time-field], [data-radix-time-picker], [role="group"][aria-label*="time"]')
      
      if (timePicker || isClockIcon || hasTimePicker) {
        e.stopPropagation()
        e.stopImmediatePropagation()
        return false
      }
    }
    
    // Prevent click-outside handlers from closing time picker immediately
    const preventTimePickerClose = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const popoverContent = target.closest('[data-rac-popover-content], [data-radix-popover-content]')
      
      if (popoverContent) {
        const hasTimePicker = popoverContent.querySelector('[data-rac-time-field], [data-rac-time-picker], [data-radix-time-field], [data-radix-time-picker], [role="group"][aria-label*="time"]')
        if (hasTimePicker) {
          // If clicking inside popover that contains time picker, don't close it
          if (popoverContent.contains(target)) {
            e.stopPropagation()
            e.stopImmediatePropagation()
            return false
          }
          
          // Prevent closing if time picker was just opened (within minimum open time)
          const timeSinceOpen = Date.now() - timePickerOpenTime
          if (timeSinceOpen < TIME_PICKER_MIN_OPEN_TIME) {
            e.stopPropagation()
            e.stopImmediatePropagation()
            return false
          }
        }
      }
      
      // Also prevent closing if clicking on the clock icon itself
      const isClockIcon = target.closest('button[aria-label*="time"], button[aria-label*="Time"], [class*="clock"], [class*="Clock"]')
      if (isClockIcon) {
        e.stopPropagation()
        e.stopImmediatePropagation()
        return false
      }
    }
    
    // Prevent focus/blur from closing time picker
    const handleTimePickerFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      const timePicker = target.closest('[data-rac-time-field], [data-rac-time-picker], [data-radix-time-field], [data-radix-time-picker], [role="group"][aria-label*="time"]')
      const popoverContent = target.closest('[data-rac-popover-content], [data-radix-popover-content]')
      const hasTimePicker = popoverContent?.querySelector('[data-rac-time-field], [data-rac-time-picker], [data-radix-time-field], [data-radix-time-picker], [role="group"][aria-label*="time"]')
      
      if (timePicker || hasTimePicker) {
        e.stopPropagation()
        e.stopImmediatePropagation()
      }
    }
    
    // Add event listeners to prevent time picker from closing
    document.addEventListener('mousedown', handleTimePickerClick, true)
    document.addEventListener('click', handleTimePickerClick, true)
    document.addEventListener('mousedown', preventTimePickerClose, true)
    document.addEventListener('click', preventTimePickerClose, true)
    document.addEventListener('focusin', handleTimePickerFocus, true)
    document.addEventListener('focusout', handleTimePickerFocus, true)
    document.addEventListener('blur', handleTimePickerFocus, true)
    
    return () => {
      observer.disconnect()
      clearInterval(checkInterval)
      clearInterval(timePickerCheckInterval)
      document.removeEventListener('mousedown', handleTimePickerClick, true)
      document.removeEventListener('click', handleTimePickerClick, true)
      document.removeEventListener('mousedown', preventTimePickerClose, true)
      document.removeEventListener('click', preventTimePickerClose, true)
      document.removeEventListener('focusin', handleTimePickerFocus, true)
      document.removeEventListener('focusout', handleTimePickerFocus, true)
      document.removeEventListener('blur', handleTimePickerFocus, true)
      const element = document.getElementById(styleId)
      if (element) {
        element.remove()
      }
    }
  }, [])

  const watchValueType = useWatch({
    control: form.control,
    name: `${fieldScope}budget.type`,
  })

  const isTypeSpend = watchValueType === "spend"

  const currencyValue = useWatch({
    control: form.control,
    name: `${fieldScope}budget.currency_code`,
  })

  const promotionCurrencyValue = useWatch({
    control: form.control,
    name: `application_method.currency_code`,
  })

  const currency = currencyValue || promotionCurrencyValue

  useEffect(() => {
    form.setValue(`${fieldScope}budget.limit`, null)

    if (isTypeSpend) {
      form.setValue(`campaign.budget.currency_code`, promotionCurrencyValue)
    }

    if (watchValueType === "usage") {
      form.setValue(`campaign.budget.currency_code`, null)
    }
  }, [watchValueType])

  if (promotionCurrencyValue) {
    const formCampaignBudget = form.getValues().campaign?.budget
    const formCampaignCurrency = formCampaignBudget?.currency_code

    if (
      formCampaignBudget?.type === "spend" &&
      formCampaignCurrency !== promotionCurrencyValue
    ) {
      form.setValue("campaign.budget.currency_code", promotionCurrencyValue)
    }
  }

  return (
    <div className="flex w-full max-w-[720px] flex-col gap-y-8">
      <div>
        <Heading>{t("campaigns.create.header")}</Heading>

        <Text size="small" className="text-ui-fg-subtle">
          {t("campaigns.create.hint")}
        </Text>
      </div>

      <div className="flex flex-col gap-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Form.Field
            control={form.control}
            name={`${fieldScope}name`}
            render={({ field }) => {
              return (
                <Form.Item>
                  <Form.Label>{t("fields.name")}</Form.Label>

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
            name={`${fieldScope}campaign_identifier`}
            render={({ field }) => {
              return (
                <Form.Item>
                  <Form.Label>{t("campaigns.fields.identifier")}</Form.Label>

                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>

                  <Form.ErrorMessage />
                </Form.Item>
              )
            }}
          />
        </div>

        <Form.Field
          control={form.control}
          name={`${fieldScope}description`}
          render={({ field }) => {
            return (
              <Form.Item>
                <Form.Label optional>{t("fields.description")}</Form.Label>

                <Form.Control>
                  <Textarea {...field} />
                </Form.Control>

                <Form.ErrorMessage />
              </Form.Item>
            )
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Form.Field
          control={form.control}
          name={`${fieldScope}starts_at`}
          render={({ field }) => {
            return (
              <Form.Item>
                <Form.Label optional>
                  {t("campaigns.fields.start_date")}
                </Form.Label>

                <Form.Control>
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      // Prevent time picker from closing when clicking inside
                      const target = e.target as HTMLElement
                      if (target.closest('[data-rac-time-field], [data-rac-time-picker], [data-radix-time-field], [data-radix-time-picker], [role="group"][aria-label*="time"]')) {
                        e.preventDefault()
                      }
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      // Prevent time picker from closing when clicking inside
                      const target = e.target as HTMLElement
                      if (target.closest('[data-rac-time-field], [data-rac-time-picker], [data-radix-time-field], [data-radix-time-picker], [role="group"][aria-label*="time"]')) {
                        e.preventDefault()
                      }
                    }}
                  >
                    <DatePicker
                      granularity="minute"
                      hourCycle={12}
                      shouldCloseOnSelect={false}
                      modal
                      {...field}
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
          name={`${fieldScope}ends_at`}
          render={({ field }) => {
            return (
              <Form.Item>
                <Form.Label optional>
                  {t("campaigns.fields.end_date")}
                </Form.Label>

                <Form.Control>
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      // Prevent time picker from closing when clicking inside
                      const target = e.target as HTMLElement
                      if (target.closest('[data-rac-time-field], [data-rac-time-picker], [data-radix-time-field], [data-radix-time-picker], [role="group"][aria-label*="time"]')) {
                        e.preventDefault()
                      }
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      // Prevent time picker from closing when clicking inside
                      const target = e.target as HTMLElement
                      if (target.closest('[data-rac-time-field], [data-rac-time-picker], [data-radix-time-field], [data-radix-time-picker], [role="group"][aria-label*="time"]')) {
                        e.preventDefault()
                      }
                    }}
                  >
                    <DatePicker
                      granularity="minute"
                      hourCycle={12}
                      shouldCloseOnSelect={false}
                      modal
                      {...field}
                    />
                  </div>
                </Form.Control>

                <Form.ErrorMessage />
              </Form.Item>
            )
          }}
        />
      </div>

      <div>
        <Heading>{t("campaigns.budget.create.header")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("campaigns.budget.create.hint")}
        </Text>
      </div>

      <Form.Field
        control={form.control}
        name={`${fieldScope}budget.type`}
        render={({ field }) => {
          return (
            <Form.Item>
              <Form.Label
                tooltip={
                  fieldScope?.length && !currency
                    ? t("promotions.tooltips.campaignType")
                    : undefined
                }
              >
                {t("campaigns.budget.fields.type")}
              </Form.Label>

              <Form.Control>
                <RadioGroup
                  className="flex gap-y-3"
                  {...field}
                  onValueChange={field.onChange}
                >
                  <RadioGroup.ChoiceBox
                    value={"usage"}
                    label={t("campaigns.budget.type.usage.title")}
                    description={t("campaigns.budget.type.usage.description")}
                  />

                  <RadioGroup.ChoiceBox
                    value={"spend"}
                    label={t("campaigns.budget.type.spend.title")}
                    description={t("campaigns.budget.type.spend.description")}
                    disabled={fieldScope?.length ? !currency : false}
                  />
                </RadioGroup>
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )
        }}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {isTypeSpend && (
          <Form.Field
            control={form.control}
            name={`${fieldScope}budget.currency_code`}
            render={({ field: { onChange, ref, ...field } }) => {
              return (
                <Form.Item>
                  <Form.Label
                    tooltip={
                      fieldScope?.length && !currency
                        ? t("promotions.campaign_currency.tooltip")
                        : undefined
                    }
                  >
                    {t("fields.currency")}
                  </Form.Label>
                  <Form.Control>
                    <Select
                      {...field}
                      onValueChange={onChange}
                      disabled={!!fieldScope.length}
                    >
                      <Select.Trigger ref={ref}>
                        <Select.Value />
                      </Select.Trigger>

                      <Select.Content>
                        {Object.values(currencies)
                          .filter(
                            (currency) =>
                              !!store?.supported_currencies?.find(
                                (c) =>
                                  c.currency_code ===
                                  currency.code.toLocaleLowerCase()
                              )
                          )
                          .map((currency) => (
                            <Select.Item
                              value={currency.code.toLowerCase()}
                              key={currency.code}
                            >
                              {currency.name}
                            </Select.Item>
                          ))}
                      </Select.Content>
                    </Select>
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )
            }}
          />
        )}

        <Form.Field
          control={form.control}
          name={`${fieldScope}budget.limit`}
          render={({ field: { onChange, value, ...field } }) => {
            return (
              <Form.Item className="basis-1/2">
                <Form.Label
                  tooltip={
                    !currency && isTypeSpend
                      ? t("promotions.fields.amount.tooltip")
                      : undefined
                  }
                >
                  {t("campaigns.budget.fields.limit")}
                </Form.Label>

                <Form.Control>
                  {isTypeSpend ? (
                    <CurrencyInput
                      min={0}
                      onValueChange={(value) =>
                        onChange(value ? parseInt(value) : "")
                      }
                      code={currencyValue}
                      symbol={
                        currencyValue ? getCurrencySymbol(currencyValue) : ""
                      }
                      {...field}
                      value={value}
                      disabled={!currency && isTypeSpend}
                    />
                  ) : (
                    <Input
                      type="number"
                      key="usage"
                      {...field}
                      min={0}
                      value={value}
                      onChange={(e) => {
                        onChange(
                          e.target.value === ""
                            ? null
                            : parseInt(e.target.value)
                        )
                      }}
                    />
                  )}
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )
          }}
        />
      </div>
    </div>
  )
}
