import { MagnifyingGlass, XMarkMini } from "@shopenup/icons"
import {
  Button,
  DatePicker,
  Divider,
  Heading,
  IconButton,
  Input,
  RadioGroup,
  Select,
  Text,
  Textarea,
  clx,
} from "@shopenup/ui"
import { useEffect } from "react"
import { useFieldArray, type UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Form } from "../../../../../components/common/form"
import { StackedFocusModal } from "../../../../../components/modals/stacked-focus-modal"
import { useStackedModal } from "../../../../../components/modals/stacked-modal-provider"
import { PriceListCustomerGroupRuleForm } from "../../../common/components/price-list-customer-group-rule-form"
import type {
  PricingCreateSchemaType,
  PricingCustomerGroupsArrayType,
} from "./schema"

type PriceListDetailsFormProps = {
  form: UseFormReturn<PricingCreateSchemaType>
}

export const PriceListDetailsForm = ({ form }: PriceListDetailsFormProps) => {
  const { t } = useTranslation()

  const { fields, remove, append } = useFieldArray({
    control: form.control,
    name: "rules.customer_group_id",
    keyName: "cg_id",
  })

  const { setIsOpen } = useStackedModal()

  // Fix z-index issue: Ensure DatePicker calendar popover appears above RouteFocusModal (z-index 100)
  useEffect(() => {
    const styleId = 'price-list-datepicker-zindex-fix'
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

  const handleAddCustomerGroup = (groups: PricingCustomerGroupsArrayType) => {
    const newIds = groups.map((group) => group.id)

    const fieldsToAdd = groups.filter(
      (group) => !fields.some((field) => field.id === group.id)
    )

    for (const field of fields) {
      if (!newIds.includes(field.id)) {
        remove(fields.indexOf(field))
      }
    }

    append(fieldsToAdd)
    setIsOpen("cg", false)
  }

  return (
    <div className="flex flex-1 flex-col items-center overflow-y-auto">
      <div className="flex w-full max-w-[720px] flex-col gap-y-8 px-8 py-16">
        <div>
          <Heading>{t("priceLists.create.header")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("priceLists.create.subheader")}
          </Text>
        </div>
        <Form.Field
          control={form.control}
          name="type"
          render={({ field: { onChange, ...rest } }) => {
            return (
              <Form.Item>
                <div className="flex flex-col gap-y-4">
                  <div>
                    <Form.Label>{t("priceLists.fields.type.label")}</Form.Label>
                    <Form.Hint>{t("priceLists.fields.type.hint")}</Form.Hint>
                  </div>
                  <Form.Control>
                    <RadioGroup
                      onValueChange={onChange}
                      {...rest}
                      className="grid grid-cols-1 gap-4 md:grid-cols-2"
                    >
                      <RadioGroup.ChoiceBox
                        value={"sale"}
                        label={t("priceLists.fields.type.options.sale.label")}
                        description={t(
                          "priceLists.fields.type.options.sale.description"
                        )}
                      />
                      <RadioGroup.ChoiceBox
                        value={"override"}
                        label={t(
                          "priceLists.fields.type.options.override.label"
                        )}
                        description={t(
                          "priceLists.fields.type.options.override.description"
                        )}
                      />
                    </RadioGroup>
                  </Form.Control>
                </div>
                <Form.ErrorMessage />
              </Form.Item>
            )
          }}
        />
        <div className="flex flex-col gap-y-4">
          <div className="grid grid-cols-1  gap-4 md:grid-cols-2">
            <Form.Field
              control={form.control}
              name="title"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label>{t("fields.title")}</Form.Label>
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
              name="status"
              render={({ field: { onChange, ref, ...field } }) => {
                return (
                  <Form.Item>
                    <Form.Label>
                      {t("priceLists.fields.status.label")}
                    </Form.Label>
                    <Form.Control>
                      <Select {...field} onValueChange={onChange}>
                        <Select.Trigger ref={ref}>
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="active">
                            {t("priceLists.fields.status.options.active")}
                          </Select.Item>
                          <Select.Item value="draft">
                            {t("priceLists.fields.status.options.draft")}
                          </Select.Item>
                        </Select.Content>
                      </Select>
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
          </div>
          <Form.Field
            control={form.control}
            name="description"
            render={({ field }) => {
              return (
                <Form.Item>
                  <Form.Label>{t("fields.description")}</Form.Label>
                  <Form.Control>
                    <Textarea {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )
            }}
          />
        </div>
        <Divider />
        <Form.Field
          control={form.control}
          name="starts_at"
          render={({ field }) => {
            return (
              <Form.Item>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="flex flex-col">
                    <Form.Label optional>
                      {t("priceLists.fields.startsAt.label")}
                    </Form.Label>
                    <Form.Hint>
                      {t("priceLists.fields.startsAt.hint")}
                    </Form.Hint>
                  </div>
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
                        shouldCloseOnSelect={false}
                        {...field}
                      />
                    </div>
                  </Form.Control>
                </div>
                <Form.ErrorMessage />
              </Form.Item>
            )
          }}
        />
        <Divider />
        <Form.Field
          control={form.control}
          name="ends_at"
          render={({ field }) => {
            return (
              <Form.Item>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="flex flex-col">
                    <Form.Label optional>
                      {t("priceLists.fields.endsAt.label")}
                    </Form.Label>
                    <Form.Hint>{t("priceLists.fields.endsAt.hint")}</Form.Hint>
                  </div>
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
                        shouldCloseOnSelect={false}
                        {...field}
                      />
                    </div>
                  </Form.Control>
                </div>
                <Form.ErrorMessage />
              </Form.Item>
            )
          }}
        />
        <Divider />
        <Form.Field
          control={form.control}
          name="rules.customer_group_id"
          render={({ field }) => {
            return (
              <Form.Item>
                <div>
                  <Form.Label optional>
                    {t("priceLists.fields.customerAvailability.label")}
                  </Form.Label>
                  <Form.Hint>
                    {t("priceLists.fields.customerAvailability.hint")}
                  </Form.Hint>
                </div>
                <Form.Control>
                  <div
                    className={clx(
                      "bg-ui-bg-component shadow-elevation-card-rest transition-fg grid gap-1.5 rounded-xl py-1.5",
                      "aria-[invalid='true']:shadow-borders-error"
                    )}
                    role="application"
                    ref={field.ref}
                  >
                    <div className="text-ui-fg-subtle grid gap-1.5 px-1.5 md:grid-cols-2">
                      <div className="bg-ui-bg-field shadow-borders-base txt-compact-small rounded-md px-2 py-1.5">
                        {t("priceLists.fields.customerAvailability.attribute")}
                      </div>
                      <div className="bg-ui-bg-field shadow-borders-base txt-compact-small rounded-md px-2 py-1.5">
                        {t("operators.in")}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-1.5">
                      <StackedFocusModal id="cg">
                        <StackedFocusModal.Trigger asChild>
                          <button
                            type="button"
                            className="bg-ui-bg-field-component hover:bg-ui-bg-field-component-hover shadow-borders-base txt-compact-small text-ui-fg-muted transition-fg focus-visible:shadow-borders-interactive-with-active flex flex-1 items-center gap-x-2 rounded-md px-2 py-1.5 outline-none"
                          >
                            <MagnifyingGlass />
                            {t(
                              "priceLists.fields.customerAvailability.placeholder"
                            )}
                          </button>
                        </StackedFocusModal.Trigger>
                        <StackedFocusModal.Trigger asChild>
                          <Button variant="secondary">
                            {t("actions.browse")}
                          </Button>
                        </StackedFocusModal.Trigger>
                        <StackedFocusModal.Content>
                          <StackedFocusModal.Header />
                          <PriceListCustomerGroupRuleForm
                            state={fields}
                            setState={handleAddCustomerGroup}
                            type="focus"
                          />
                        </StackedFocusModal.Content>
                      </StackedFocusModal>
                    </div>
                    {fields.length > 0 ? (
                      <div className="flex flex-col gap-y-1.5">
                        <Divider variant="dashed" />
                        <div className="flex flex-col gap-y-1.5 px-1.5">
                          {fields.map((field, index) => {
                            return (
                              <div
                                key={field.cg_id}
                                className="bg-ui-bg-field-component shadow-borders-base flex items-center justify-between gap-2 rounded-md px-2 py-0.5"
                              >
                                <Text size="small" leading="compact">
                                  {field.name}
                                </Text>
                                <IconButton
                                  size="small"
                                  variant="transparent"
                                  type="button"
                                  onClick={() => remove(index)}
                                >
                                  <XMarkMini />
                                </IconButton>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
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
