/*
 * Copyright 2025 Shopenup
 *
 * MIT License
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useState } from 'react';
import { useMemo } from "react";
import { defineRouteConfig } from "@shopenup/admin-sdk";
import { Tabs } from "@shopenup/ui";
import { LightBulb } from "@shopenup/icons";
import { Box } from "@mui/material";

import OverviewTab from "./ui-components/tabs/overview";
import OrdersTab from "./ui-components/tabs/orders";
import ProductsTab from './ui-components/tabs/products';
import SalesTab from './ui-components/tabs/sales';
import CustomersTab from './ui-components/tabs/customers';

import { 
  DateLasts, 
  DropdownOrderStatus, 
  OrderStatus, 
  convertDateLastsToComparedDateRange, 
  convertDateLastsToDateRange 
} from './ui-components';

import { 
  ComparedDate, 
  GenerateReportButton, 
  SelectDateLasts, 
  SwitchComparison 
} from './ui-components/common/overview-components';

export const Analytics = () => {
  const [dateLast, setDateLasts] = useState<DateLasts>(DateLasts.LastWeek);
  const [compareEnabled, setCompare] = useState<boolean>(true);
  const [orderStatuses, setOrderStatuses] = useState<OrderStatus[]>([
    OrderStatus.COMPLETED,
    OrderStatus.PENDING
  ]);

  const dateRange = useMemo(() => convertDateLastsToDateRange(dateLast), [dateLast]);
  const dateRangeComparedTo = useMemo(
    () => convertDateLastsToComparedDateRange(dateLast),
    [dateLast]
  );

  function setDateLastsString(select: string) {
    switch (select) {
      case DateLasts.LastWeek:
      case DateLasts.LastMonth:
      case DateLasts.LastYear:
      case DateLasts.All:
        setDateLasts(select);
        break;
    }
  }

  return (
    <div className="space-y-6 w-full relative z-0">
      {/* Sticky Top Control Bar - Mobile Responsive */}
      <div className="bg-ui-bg-base border border-ui-border-base rounded-xl shadow-sm sticky top-0 z-10 px-3 sm:px-4 py-3">
        <div className="flex flex-col md:flex-row md:justify-between gap-3 md:items-center">

          {/* Left — Title + Compared Date */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="text-lg sm:text-xl font-semibold">Analytics</div>
            <ComparedDate 
              compare={compareEnabled} 
              comparedToDateRange={dateRangeComparedTo}
            />
          </div>

          {/* Right — Filters */}
          <div className="flex flex-wrap gap-2 sm:gap-3 justify-start md:justify-end">
            <DropdownOrderStatus 
              onOrderStatusChange={setOrderStatuses} 
              appliedStatuses={orderStatuses} 
            />

            <SelectDateLasts 
              dateLast={dateLast} 
              onSelectChange={setDateLastsString} 
            />

            <SwitchComparison 
              compareEnabled={compareEnabled}
              onCheckChange={setCompare}
              allTime={dateLast === DateLasts.All}
            />

            <GenerateReportButton
              orderStatuses={orderStatuses}
              dateRange={dateRange}
              dateRangeCompareTo={dateRangeComparedTo}
              compareEnabled={compareEnabled}
            />
          </div>
        </div>
      </div>

      {/* Tabs Section - Mobile Scrollable */}
      <Tabs defaultValue="overview">
        <Tabs.List
          className="
            flex overflow-x-auto no-scrollbar gap-0.5 sm:gap-2 items-center justify-center
            bg-ui-bg-base border border-ui-border-base rounded-xl p-0.5 sm:p-1 text-[30px] sm:text-xs
          "
        >
          <Tabs.Trigger value="overview" className="px-1.5 sm:px-2 py-1.5 sm:py-2 rounded-lg whitespace-nowrap md:text-[12px] sm:text-xs">
            Overview
          </Tabs.Trigger>
          <Tabs.Trigger value="sales" className="px-1.5 sm:px-2 py-1.5 sm:py-2 rounded-lg whitespace-nowrap text-[12px] sm:text-xs">
            Sales
          </Tabs.Trigger>
          <Tabs.Trigger value="orders" className="px-1.5 sm:px-2 py-1.5 sm:py-2 rounded-lg whitespace-nowrap text-[12px] sm:text-xs">
            Orders
          </Tabs.Trigger>
          <Tabs.Trigger value="customers" className="px-1.5 sm:px-2 py-1.5 sm:py-2 rounded-lg whitespace-nowrap text-[12px] sm:text-xs">
            Customers
          </Tabs.Trigger>
          <Tabs.Trigger value="products" className="px-1.5 sm:px-2 py-1.5 sm:py-2 rounded-lg whitespace-nowrap text-[12px] sm:text-xs">
            Products
          </Tabs.Trigger>
        </Tabs.List>

        {/* --- Tab Contents — Fully Responsive --- */}
        <Tabs.Content value="overview">
      
          <Box height={16} />
          <OverviewTab 
            orderStatuses={orderStatuses} 
            dateRange={dateRange}
            dateRangeCompareTo={dateRangeComparedTo} 
            compareEnabled={compareEnabled} 
          />
      
        </Tabs.Content>

        <Tabs.Content value="sales">
          <Box height={16} />
          <SalesTab 
            orderStatuses={orderStatuses} 
            dateRange={dateRange}
            dateRangeCompareTo={dateRangeComparedTo} 
            compareEnabled={compareEnabled} 
          />
        </Tabs.Content>

        <Tabs.Content value="orders">
          <Box height={16} />
          <OrdersTab 
            orderStatuses={orderStatuses} 
            dateRange={dateRange}
            dateRangeCompareTo={dateRangeComparedTo} 
            compareEnabled={compareEnabled} 
          />
        </Tabs.Content>

        <Tabs.Content value="customers">
          <Box height={16} />
          <CustomersTab 
            orderStatuses={orderStatuses} 
            dateRange={dateRange}
            dateRangeCompareTo={dateRangeComparedTo} 
            compareEnabled={compareEnabled} 
          />
        </Tabs.Content>

        <Tabs.Content value="products">
          <Box height={16} />
          <ProductsTab 
            orderStatuses={orderStatuses} 
            dateRange={dateRange}
            dateRangeCompareTo={dateRangeComparedTo} 
            compareEnabled={compareEnabled} 
          />
        </Tabs.Content>
       
      </Tabs>
 
    </div>
  );
};

export default Analytics;

export const config = defineRouteConfig({
  label: "Analytics",
  icon: LightBulb,
});
