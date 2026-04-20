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
import { Users } from "@shopenup/icons";
import type { DateRange } from "../../utils/types";
import { CumulativeCustomersChart } from "./cumulative-customers-chart";

export const CumulativeCustomersCard = ({dateRange, dateRangeCompareTo, compareEnabled} : 
  {dateRange?: DateRange, dateRangeCompareTo?: DateRange, compareEnabled: boolean}) => {
  return (
    <div style={{ display: 'grid', paddingBottom: 16, gap: 12, width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      <div style={{ display: 'grid', gridAutoFlow: 'column', gap: 8, alignItems: 'center', justifyContent: 'start', width: '100%', maxWidth: '100%', minWidth: 0 }}>
        <div>
          <Users/>
        </div>
        <div style={{ minWidth: 0 }}>
          <Heading level="h2">
            Cumulative customers
          </Heading>
        </div>
      </div>
      <div style={{ width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden' }}>
        <CumulativeCustomersChart dateRange={dateRange} dateRangeCompareTo={dateRangeCompareTo} compareEnabled={compareEnabled}/>
      </div>
    </div>
  )
}