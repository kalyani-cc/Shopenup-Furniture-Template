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

import { Heading, Select, Text, Alert } from "@shopenup/ui";
import { CurrencyDollar } from "@shopenup/icons";
import { CircularProgress } from "@mui/material";
import type { DateRange } from "../../utils/types";
import { useEffect, useState } from 'react';
import { RefundsResponse } from "../types";
import { RefundsNumber } from "./refunds-numbers";
type RegionDTO = { currency_code: string };
import { deduceDateUrlParams } from "../../../ui-components/utils/helpers";
const API_BASE_URL = import.meta.env.VITE_SHOPENUP_BACKEND_URL || "";

const RefundsDetails = ({currencyCode, dateRange, dateRangeCompareTo, compareEnabled} : 
  {currencyCode: string, dateRange?: DateRange, dateRangeCompareTo?: DateRange, compareEnabled?: boolean}) => {

  const [data, setData] = useState<RefundsResponse | undefined>(undefined)

  const [error, setError] = useState<any>(undefined);

  const [isLoading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true);
  }, [dateRange, dateRangeCompareTo, currencyCode])

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const searchParams = deduceDateUrlParams(dateRange, dateRangeCompareTo);
    searchParams.append('currencyCode', currencyCode)

    fetch(`${API_BASE_URL}/admin/sales-analytics/refunds?${searchParams.toString()}` , {
      credentials: "include",
    })
    .then((res) => res.json())
    .then((result) => {
      setData(result)
      setLoading(false)
    })
    .catch((error) => {
      setError(error);
      console.error(error);
    }) 
  }, [isLoading])

  if (isLoading) {
    return <CircularProgress size={12}/>
  }

  if (error) {
    const trueError = error as any;
    const errorText = `Error when loading data. It shouldn't have happened - please raise an issue. For developer: ${trueError?.response?.data?.message}`
    return <Alert variant="error">{errorText}</Alert>
  }

  if (data && data.analytics == undefined) {
    return (
      <div> 
        <Heading level="h3">Cannot get refunds</Heading>
      </div>
    )
  }

  if (data && data.analytics.dateRangeFrom) {
    return (
      <>
        <div>
          <RefundsNumber refundsResponse={data} compareEnabled={compareEnabled}/>
        </div>
      </>
    )
  } else {
    return (
      <div> 
        <Heading level="h3">No orders</Heading>
      </div>
    )
  }
}

export const RefundsOverviewCard = ({dateRange, dateRangeCompareTo, compareEnabled} : 
  {dateRange?: DateRange, dateRangeCompareTo?: DateRange, compareEnabled: boolean}) => {

    const [ value , setValue ] = useState<string | undefined>('inr');

    const [regions, setRegions] = useState<RegionDTO[] | undefined>(undefined)
  
    const [error, setError] = useState<any>(undefined);
  
    const [isLoading, setLoading] = useState(true)
  
    useEffect(() => {
      if (!isLoading) {
        return;
      }
  
      fetch(`${API_BASE_URL}/admin/regions/` , {
        credentials: "include",
      })
      .then((res) => res.json())
      .then((result) => {
        setRegions(result.regions)
        setLoading(false)
      })
      .catch((error) => {
        setError(error);
        console.error(error);
      }) 
    }, [isLoading])
  
  return (
    <div style={{ display: 'grid', paddingBottom: 16, gap: 12 }}>
      <div>
          <div style={{ display: 'grid', gridAutoFlow: 'column', gap: 8, alignItems: 'center', justifyContent: 'start' }}>
            <div>
              <CurrencyDollar/>
            </div>
            <div>
              <Heading level="h2">
                Total refunds
              </Heading>
            </div>
            <div>
              <div className="w-[256px]">
                <Select size="small" onValueChange={setValue} value={value}>
                  <Select.Trigger>
                    <Select.Value placeholder="Select a currency" />
                  </Select.Trigger>
                  <Select.Content>
                    {isLoading && <CircularProgress/>}
                    {regions && !regions.length && <Text>No regions</Text>}
                    {regions && regions.length > 0 && [...new Set(regions.map(region => region.currency_code))].map((currencyCode) => (
                      <Select.Item key={currencyCode} value={currencyCode}>
                        {currencyCode.toUpperCase()}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
            </div>
          </div>
      </div>
      {value ? <RefundsDetails currencyCode={value} dateRange={dateRange} dateRangeCompareTo={dateRangeCompareTo} compareEnabled={compareEnabled}/> : 
        <div>
          <Heading level="h2">Please select a currency</Heading>
        </div>
      }
    </div>
  )
}