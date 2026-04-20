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

import { Heading } from "@shopenup/ui";
import { ShoppingCart } from "@shopenup/icons";
import { OrdersByNewChart } from "./orders-by-new-chart";
import type { DateRange } from "../utils/types";
import { OrdersNumber } from "./orders-number-overview";
import { OrderStatus } from "../utils/types";

export const OrdersOverviewCard = ({orderStatuses, dateRange, dateRangeCompareTo, compareEnabled} : 
  {orderStatuses: OrderStatus[], dateRange?: DateRange, dateRangeCompareTo?: DateRange, compareEnabled: boolean}) => {
  return (
    <div style={{ display: 'grid', paddingBottom: 16, gap: 12 }}>
      <div style={{ display: 'grid', gridAutoFlow: 'column', gap: 8, alignItems: 'center', justifyContent: 'start' }}>
        <div>
          <ShoppingCart/>
        </div>
        <div>
          <Heading level="h2">
            Orders
          </Heading>
        </div>
      </div>
      <div >
        <OrdersNumber orderStatuses={orderStatuses} dateRange={dateRange} dateRangeCompareTo={dateRangeCompareTo} compareEnabled={compareEnabled}/>
      </div>
      <div>
        <OrdersByNewChart orderStatuses={orderStatuses} dateRange={dateRange} dateRangeCompareTo={dateRangeCompareTo} compareEnabled={compareEnabled}/>
      </div>
    </div>
  )
}