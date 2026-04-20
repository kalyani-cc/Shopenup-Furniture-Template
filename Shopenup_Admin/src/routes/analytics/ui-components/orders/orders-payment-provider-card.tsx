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

import { Heading, Alert } from "@shopenup/ui";
import { Grid, Skeleton, Stack } from "@mui/material";
import type { DateRange } from "../utils/types";
import { Cash } from "@shopenup/icons";
import { OrdersPaymentProviderResponse } from "./types";
import { OrdersPaymentProviderPieChart } from "./orders-payment-provider-chart";
import { useEffect, useState } from "react";
import { deduceDateUrlParams } from "../utils/helpers";
const API_BASE_URL = import.meta.env.VITE_SHOPENUP_BACKEND_URL || "";

const OrdersPaymentProviderDetails = ({dateRange, dateRangeCompareTo, compareEnabled} : 
  {dateRange?: DateRange, dateRangeCompareTo?: DateRange, compareEnabled: boolean}) => {

    const [data, setData] = useState<OrdersPaymentProviderResponse | undefined>(undefined)

    const [error, setError] = useState<any>(undefined);
  
    const [isLoading, setLoading] = useState(true)
  
    useEffect(() => {
      setLoading(true);
    }, [dateRange, dateRangeCompareTo])
  
    useEffect(() => {
      if (!isLoading) {
        return;
      }
  
      fetch(`${API_BASE_URL}/admin/orders-analytics/payment-provider?${deduceDateUrlParams(dateRange, dateRangeCompareTo).toString()}` , {
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
    return (
      <Stack direction={'column'} alignItems={'center'} spacing={2} paddingTop={2}>
        <Skeleton variant="circular" width={180} height={180} />
        <Skeleton variant="text" width={120} />
      </Stack>
    )
  }

  if (error) {
    const trueError = error as any;
    const errorText = `Error when loading data. It shouldn't have happened - please raise an issue. For developer: ${trueError?.response?.data?.message}`
    return <Alert variant="error">{errorText}</Alert>
  }

  if (data && data.analytics == undefined) {
    return <Heading level="h3">Cannot get orders</Heading>
  }

  if (data && data.analytics.dateRangeFrom) {
    return <OrdersPaymentProviderPieChart ordersPaymentProviderResponse={data} compareEnabled={compareEnabled}/>
  } else {
    return <Heading level="h3">No orders</Heading>
  }
}

export const OrdersPaymentProviderCard = ({ dateRange, dateRangeCompareTo, compareEnabled} : 
  {dateRange?: DateRange, dateRangeCompareTo?: DateRange, compareEnabled: boolean}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12, paddingBottom: 8 }}>
      <div>
        <Stack direction="row" spacing={1.5} alignItems={'center'}>
          <Cash/>
          <Heading level="h2">Payment provider popularity</Heading>
        </Stack>
      </div>
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%', minWidth: 0 }}>
        <Grid container direction={'column'} alignItems={'center'} style={{ width: '100%' }}>
          <div style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
            <OrdersPaymentProviderDetails dateRange={dateRange} dateRangeCompareTo={dateRangeCompareTo} compareEnabled={compareEnabled}/>
          </div>
        </Grid>
      </div>
    </div>
  )
}