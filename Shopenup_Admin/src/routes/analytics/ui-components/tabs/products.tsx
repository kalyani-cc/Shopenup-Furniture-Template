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
  ProductsSoldCountCard,
  VariantsTopByCountCard,
  ReturnedVariantsByCountCard,
  OutOfTheStockVariantsCard,
  OrderStatus,
} from '..';
import type { DateRange } from '..';
import { useMediaQuery } from "../../../../hooks/use-media-query";

const ProductsTab = ({orderStatuses, dateRange, dateRangeCompareTo, compareEnabled} : 
  {orderStatuses: OrderStatus[], dateRange?: DateRange, dateRangeCompareTo?: DateRange, compareEnabled: boolean}) => {
    // Responsive breakpoints
    const isLargeScreen = useMediaQuery("(min-width: 1024px)");
    const isTablet = useMediaQuery("(min-width: 640px)");
    
    // Responsive grid columns for second row
    const secondRowColumns = isLargeScreen ? 'repeat(3, 1fr)' : isTablet ? 'repeat(2, 1fr)' : '1fr';
    
    return (
      <div style={{ display: 'grid', gap: 24 }}>
        {/* First row: Products sold card */}
        <div style={{ display: 'flex', justifyContent: isLargeScreen ? 'left' : 'center' }}>
          <div style={{ maxWidth: isLargeScreen ? '300px' : '100%', width: '100%' }}>
            <Container>
              <ProductsSoldCountCard orderStatuses={orderStatuses} dateRange={dateRange} dateRangeCompareTo={dateRangeCompareTo} compareEnabled={compareEnabled}/>
            </Container>
          </div>
        </div>
        {/* Second row: Responsive grid of cards */}
        <div style={{ 
          display: 'grid', 
          gap: 24, 
          gridTemplateColumns: secondRowColumns,
          alignItems: 'stretch' 
        }}>
          <div style={{ display: 'flex', height: '100%' }}>
            <Container style={{ width: '100%', height: '100%' }}>
              <VariantsTopByCountCard orderStatuses={orderStatuses} dateRange={dateRange} dateRangeCompareTo={dateRangeCompareTo} compareEnabled={compareEnabled}/>
            </Container>
          </div>
          <div style={{ display: 'flex', height: '100%' }}>
            <Container style={{ width: '100%', height: '100%' }}>
              <ReturnedVariantsByCountCard dateRange={dateRange} dateRangeCompareTo={dateRangeCompareTo}/>
            </Container>
          </div>
          <div style={{ display: 'flex', height: '100%' }}>
            <Container style={{ width: '100%', height: '100%' }}>
              <OutOfTheStockVariantsCard/>
            </Container>
          </div>
        </div>
      </div> 
    )
}

export default ProductsTab