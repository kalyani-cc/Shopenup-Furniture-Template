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

import { Container } from "@shopenup/ui"
import { 
  DiscountsTopCard,
  SalesChannelPopularityCard,
  OrderStatus,
  SalesOverviewCard,
  RefundsOverviewCard
} from '..';
import type { DateRange } from '..';
import { useMediaQuery } from "../../../../hooks/use-media-query";

const SalesTab = ({orderStatuses, dateRange, dateRangeCompareTo, compareEnabled} : 
  {orderStatuses: OrderStatus[], dateRange?: DateRange, dateRangeCompareTo?: DateRange, compareEnabled: boolean}) => {
    // Responsive breakpoint for large screens
    const isLargeScreen = useMediaQuery("(min-width: 1024px)");
    
    return (
      <div style={{ 
        display: 'grid', 
        gap: 24, 
        gridTemplateColumns: isLargeScreen ? '1fr 1fr' : '1fr', 
        alignItems: 'stretch' 
      }}>
        {/* Left: big sales chart/card */}
        <div style={{ display: 'flex', height: '100%' }}>
          <Container style={{ width: '100%', height: '100%' }}>
            <SalesOverviewCard orderStatuses={orderStatuses} dateRange={dateRange} dateRangeCompareTo={dateRangeCompareTo} compareEnabled={compareEnabled}/>
          </Container>
        </div>

        {/* Right: stacked cards */}
        <div style={{ display: 'grid', gap: 24 }}>
          <Container>
            <SalesChannelPopularityCard orderStatuses={orderStatuses} dateRange={dateRange} dateRangeCompareTo={dateRangeCompareTo} compareEnabled={compareEnabled}/>
          </Container>
          <Container>
            <RefundsOverviewCard dateRange={dateRange} dateRangeCompareTo={dateRangeCompareTo} compareEnabled={compareEnabled}/>
          </Container>
          <Container>
            <DiscountsTopCard orderStatuses={orderStatuses} dateRange={dateRange} dateRangeCompareTo={dateRangeCompareTo}/>
          </Container>
        </div>
      </div>
    )
}

export default SalesTab