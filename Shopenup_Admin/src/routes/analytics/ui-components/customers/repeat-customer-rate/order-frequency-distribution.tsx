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
import { CustomersRepeatCustomerRateResponse } from "../types"
import { OrderFrequencyDistributionPieChart } from "./order-frequency-distribution-chart";

export const OrderFrequencyDistribution = ({repeatCustomerRateResponse, compareEnabled} : {repeatCustomerRateResponse: CustomersRepeatCustomerRateResponse, compareEnabled?: boolean}) => {
  return (
    <div style={{ width: '100%', maxWidth: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 24, gap: 16 }}>
      <div>
        <Heading level="h3">
          How orders were distributed?
        </Heading>
      </div>
      <div style={{ width: '100%', maxWidth: '100%', minWidth: 0, display: 'flex', justifyContent: 'center' }}>
        <OrderFrequencyDistributionPieChart repeatCustomerRateResponse={repeatCustomerRateResponse} compareEnabled={compareEnabled}/>
      </div>
    </div>
  )
}