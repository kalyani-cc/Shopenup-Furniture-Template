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
  CustomersOverviewCard,
  CustomersRepeatCustomerRate,
  CumulativeCustomersCard,
  OrderStatus,
} from '..';
import type { DateRange } from '..';
import { useMediaQuery } from "../../../../hooks/use-media-query";

const CustomersTab = ({orderStatuses, dateRange, dateRangeCompareTo, compareEnabled} : 
  {orderStatuses: OrderStatus[], dateRange?: DateRange, dateRangeCompareTo?: DateRange, compareEnabled: boolean}) => {
    // Responsive breakpoint for large screens
    const isLargeScreen = useMediaQuery("(min-width: 1024px)");
    
    // Responsive grid columns: 2 columns on large screens, 1 column on smaller screens
    const gridColumns = isLargeScreen ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)";
    
    return (
      <div style={{ 
        display: 'grid', 
        gap: isLargeScreen ? 24 : 16,
        width: "100%",
        maxWidth: "100%",
        gridTemplateColumns: gridColumns, 
        alignItems: 'stretch',
        boxSizing: "border-box",
        padding: 0,
        margin: 0,
        overflow: "hidden"
      }}>
        <div style={{ 
          display: 'flex', 
          height: '100%',
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          overflow: "auto",
          boxSizing: "border-box"
        }}>
          <Container style={{ 
            width: '100%', 
            height: '100%',
            maxWidth: "100%",
            minWidth: 0,
            overflow: "auto",
            boxSizing: "border-box"
          }}>
            <CustomersOverviewCard dateRange={dateRange} dateRangeCompareTo={dateRangeCompareTo} compareEnabled={compareEnabled}/>
          </Container>
        </div>
        <div style={{ 
          display: 'flex', 
          height: '100%',
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          overflow: "auto",
          boxSizing: "border-box"
        }}>
          <Container style={{ 
            width: '100%', 
            height: '100%',
            maxWidth: "100%",
            minWidth: 0,
            overflow: "auto",
            boxSizing: "border-box"
          }}>
            <CumulativeCustomersCard dateRange={dateRange} dateRangeCompareTo={dateRangeCompareTo} compareEnabled={compareEnabled}/>
          </Container>
        </div>
        <div style={{ 
          display: 'flex', 
          height: '100%',
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          overflow: "auto",
          boxSizing: "border-box"
        }}>
          <Container style={{ 
            width: '100%', 
            height: '100%',
            maxWidth: "100%",
            minWidth: 0,
            overflow: "auto",
            boxSizing: "border-box"
          }}>
            <CustomersRepeatCustomerRate orderStatuses={orderStatuses} dateRange={dateRange} dateRangeCompareTo={dateRangeCompareTo} compareEnabled={compareEnabled}/>
          </Container>
        </div>
        {/* <div style={{ display: 'flex', height: '100%' }}>
          <Container style={{ width: '100%', height: '100%' }}>
            <CustomersRetentionCustomerRate orderStatuses={orderStatuses} dateRange={dateRange} dateRangeCompareTo={dateRangeCompareTo} compareEnabled={compareEnabled}/>
          </Container>
        </div> */}
      </div>
    )
}

export default CustomersTab