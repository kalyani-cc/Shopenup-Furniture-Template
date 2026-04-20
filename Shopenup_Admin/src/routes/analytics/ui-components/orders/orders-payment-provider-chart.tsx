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

import { getLegendName } from "../common/utils/chartUtils";
import { Legend, Pie, PieChart, Tooltip, ResponsiveContainer } from "recharts";
import { OrdersPaymentProvider, OrdersPaymentProviderResponse } from "./types";
import { Text, Container } from "@shopenup/ui";
import { useMediaQuery } from "../../../../hooks/use-media-query";

function convertToChartData(ordersPaymentProviders: OrdersPaymentProvider[]) {
  if (ordersPaymentProviders.length) {
    return ordersPaymentProviders.map(ordersPaymentProvider => {
      return {
        name: ordersPaymentProvider.paymentProviderId,
        value: parseFloat(ordersPaymentProvider.percentage),
        displayValue: ordersPaymentProvider.paymentProviderId,
        orderCount: ordersPaymentProvider.orderCount,
      }
    })
  }
  return undefined;
}

type TooltipPayload = {
  payload: {
    name: string;
    value: number;
    displayValue: string;
    orderCount: number;
  };
};

type ChartCustomTooltipProps = {
  active?: boolean;
  payload?: readonly TooltipPayload[];
};

const ChartCustomTooltip = ({ active, payload }: ChartCustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
        <Container>
          <Text>{`${payload[0].payload.value}%`}</Text>
          <Text>{`Provider: ${payload[0].payload.name}`}</Text>
          <Text>{`Order count: ${payload[0].payload.orderCount}`}</Text>
        </Container>
      )
  }
  return null;
};

export const OrdersPaymentProviderPieChart = ({ordersPaymentProviderResponse, compareEnabled} : {ordersPaymentProviderResponse: OrdersPaymentProviderResponse, compareEnabled?: boolean}) => {
  const isMobile = useMediaQuery("(max-width: 640px)");
  
  const currentData = convertToChartData(ordersPaymentProviderResponse.analytics.current);
  const previousData = convertToChartData(ordersPaymentProviderResponse.analytics.previous);

  const renderLabel = (entry: { displayValue?: string; name?: string }) => {
    return entry.displayValue || entry.name || '';
  }

  const chartHeight = isMobile ? 250 : 300;

  return (
    <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, height: chartHeight, minHeight: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={currentData} dataKey="value" cx="50%" cy="50%" innerRadius={isMobile ? 30 : 40} outerRadius={isMobile ? 70 : 90} fill="#82ca9d" label={renderLabel} legendType="none" />
          {compareEnabled && ordersPaymentProviderResponse.analytics.dateRangeFromCompareTo  &&
          
            <Pie data={previousData} dataKey="value" cx="50%" cy="50%" outerRadius={isMobile ? 20 : 30} fill="#8884d8" />
          }
          {(compareEnabled && ordersPaymentProviderResponse.analytics.dateRangeFromCompareTo) && 
         <Legend 
           // @ts-ignore - payload prop exists at runtime but not in TypeScript types
           payload={[
             { value: getLegendName(true), color: "#82ca9d" },
             { value: getLegendName(false), color: "#8884d8" }
           ]}
           iconType="circle" 
         />
}
          <Tooltip content={<ChartCustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}