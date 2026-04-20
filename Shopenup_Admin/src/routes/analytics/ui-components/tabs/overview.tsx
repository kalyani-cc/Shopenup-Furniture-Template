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

import { Alert, Container } from "@shopenup/ui"
import { 
  OrdersOverviewCard,
  SalesOverviewCard,
  CustomersOverviewCard,
  SalesChannelPopularityCard,
  RegionsPopularityCard,
  VariantsTopByCountCard,
  OrderStatus,
  ProductsSoldCountCard,
  CumulativeCustomersCard
} from '..';
import type { DateRange } from '..';
import { useMediaQuery } from "../../../../hooks/use-media-query";

const InfoBox = () => {
  return (
    <Alert variant="info">
      Click on other tabs to see more statistics.
    </Alert>
  );
};

const OverviewTab = ({
  orderStatuses,
  dateRange,
  dateRangeCompareTo,
  compareEnabled
}: {
  orderStatuses: OrderStatus[];
  dateRange?: DateRange;
  dateRangeCompareTo?: DateRange;
  compareEnabled: boolean;
}) => {
  // Responsive breakpoint for large screens
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  
  return (
    <div
      style={{
        display: "grid",
        gap: 24,
      }}
    >
      {/* Responsive Grid - 2 columns on large screens, 1 column on smaller screens */}
      <div
        style={{
          display: "grid",
          gap: 24,
          gridTemplateColumns: isLargeScreen ? "repeat(2, 1fr)" : "1fr",
          alignItems: "stretch",
        }}
      >
        <div style={{ display: 'flex', height: '100%' }}>
          <Container style={{ width: '100%', height: '100%' }}>
            <OrdersOverviewCard
              orderStatuses={orderStatuses}
              dateRange={dateRange}
              dateRangeCompareTo={dateRangeCompareTo}
              compareEnabled={compareEnabled}
            />
          </Container>
        </div>

        <div style={{ display: 'flex', height: '100%' }}>
          <Container style={{ width: '100%', height: '100%' }}>
            <SalesOverviewCard
              orderStatuses={orderStatuses}
              dateRange={dateRange}
              dateRangeCompareTo={dateRangeCompareTo}
              compareEnabled={compareEnabled}
            />
          </Container>
        </div>

        <div style={{ display: 'flex', height: '100%' }}>
          <Container style={{ width: '100%', height: '100%' }}>
            <CustomersOverviewCard
              dateRange={dateRange}
              dateRangeCompareTo={dateRangeCompareTo}
              compareEnabled={compareEnabled}
            />
          </Container>
        </div>

        <div style={{ display: 'flex', height: '100%' }}>
          <Container style={{ width: '100%', height: '100%' }}>
            <CumulativeCustomersCard
              dateRange={dateRange}
              dateRangeCompareTo={dateRangeCompareTo}
              compareEnabled={compareEnabled}
            />
          </Container>
        </div>

        <div style={{ display: 'flex', height: '100%' }}>
          <Container style={{ width: '100%', height: '100%' }}>
            <VariantsTopByCountCard
              orderStatuses={orderStatuses}
              dateRange={dateRange}
              dateRangeCompareTo={dateRangeCompareTo}
              compareEnabled={compareEnabled}
            />
          </Container>
        </div>

        <div style={{ display: 'flex', height: '100%' }}>
          <Container style={{ width: '100%', height: '100%' }}>
            <SalesChannelPopularityCard
              orderStatuses={orderStatuses}
              dateRange={dateRange}
              dateRangeCompareTo={dateRangeCompareTo}
              compareEnabled={compareEnabled}
            />
          </Container>
        </div>

        <div style={{ display: 'flex', height: '100%' }}>
          <Container style={{ width: '100%', height: '100%' }}>
            <RegionsPopularityCard
              orderStatuses={orderStatuses}
              dateRange={dateRange}
              dateRangeCompareTo={dateRangeCompareTo}
              compareEnabled={compareEnabled}
            />
          </Container>
        </div>

        <div style={{ display: 'flex', height: '100%' }}>
          <Container style={{ width: '100%', height: '100%' }}>
            <ProductsSoldCountCard
              orderStatuses={orderStatuses}
              dateRange={dateRange}
              dateRangeCompareTo={dateRangeCompareTo}
              compareEnabled={compareEnabled}
            />
          </Container>
        </div>
      </div>

      {/* Info box centered */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: 24,
          marginBottom: 40,
        }}
      >
        <InfoBox />
      </div>
    </div>
  );
};

export default OverviewTab;
