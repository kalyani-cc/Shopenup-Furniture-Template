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

import { getLegendName } from "../../common/utils/chartUtils";
import { CustomersRepeatCustomerRateResponse, Distributions } from "../types"
import { Legend, Pie, PieChart, Tooltip, ResponsiveContainer } from "recharts";
import { useMediaQuery } from "../../../../../hooks/use-media-query";

const ONE_TIME_LABEL_NAME = 'One-time purchase';
const REPEAT_LABEL_NAME = 'Repeat purchase';

function convertToChartData(distributions: Distributions) {
  if (distributions) {
    if (distributions.orderOneTimeFrequency || distributions.orderRepeatFrequency) {
      const oneTimeValue = distributions.orderOneTimeFrequency ? parseInt(distributions.orderOneTimeFrequency) : 0;
      const repeatValue = distributions.orderRepeatFrequency ? parseInt(distributions.orderRepeatFrequency) : 0;
      return [
        {
          name: ONE_TIME_LABEL_NAME,
          value: oneTimeValue,
          displayValue: ONE_TIME_LABEL_NAME
        },
        {
          name: REPEAT_LABEL_NAME,
          value: repeatValue,
          displayValue: REPEAT_LABEL_NAME
        }
      ]
    }
  }
  return undefined;
}

export const OrderFrequencyDistributionPieChart = ({repeatCustomerRateResponse, compareEnabled} : {repeatCustomerRateResponse: CustomersRepeatCustomerRateResponse, compareEnabled?: boolean}) => {
  const isMobile = useMediaQuery("(max-width: 640px)");
  
  const currentData = convertToChartData(repeatCustomerRateResponse.analytics.current);
  const previousData = convertToChartData(repeatCustomerRateResponse.analytics.previous);

  const renderLabel = (entry: { displayValue?: string; name?: string }) => {
    return entry.displayValue || entry.name || '';
  }

  const chartHeight = isMobile ? 250 : 300;

  // Ensure we have data to display
  if (!currentData || currentData.length === 0) {
    return null;
  }

  return (
    <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, height: chartHeight, minHeight: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={currentData} dataKey="value" cx="50%" cy="50%" innerRadius={isMobile ? 30 : 40} outerRadius={isMobile ? 70 : 90} fill="#82ca9d" label={renderLabel} legendType="none"/>
          {compareEnabled && repeatCustomerRateResponse.analytics.dateRangeFromCompareTo && previousData !== undefined && previousData.length > 0 &&
            <Pie data={previousData} dataKey="value" cx="50%" cy="50%" outerRadius={isMobile ? 20 : 30} fill="#8884d8"/>
          }
          {(compareEnabled && repeatCustomerRateResponse.analytics.dateRangeFromCompareTo && previousData !== undefined && previousData.length > 0) && 
          <Legend 
            // @ts-ignore - payload prop exists at runtime but not in TypeScript types
            payload={[
              {
                value: getLegendName(true),
                color: "#82ca9d"
              },
              {
                value: getLegendName(false),
                color: "#8884d8"
              }
            ]} 
            iconType="circle"
          />}
          <Tooltip formatter={(value) => `${value}%`}/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}