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
import { ShoppingBag } from "@shopenup/icons";
import { Grid, Skeleton, Table, TableBody, TableCell, TableContainer, TableRow, Paper, Stack } from "@mui/material";
import type { DateRange } from "../utils/types";
import { PopularityTable, PopularityTableRow } from "../common/popularity-table";
import { OrderStatus } from "../utils/types";
import { useEffect, useState } from "react";
import { deduceDateUrlParams } from "../utils/helpers";
const API_BASE_URL = import.meta.env.VITE_SHOPENUP_BACKEND_URL || "";

type OrdersSalesChannelPopularity = {
  date: string,
  orderCount: string,
  salesChannelId: string
  salesChannelName: string,
}

type OrdersSalesChannelPopularityResult = {
  dateRangeFrom?: number
  dateRangeTo?: number,
  dateRangeFromCompareTo?: number,
  dateRangeToCompareTo?: number,
  current: OrdersSalesChannelPopularity[]
  previous: OrdersSalesChannelPopularity[]
}

type OrdersSalesChannelPopularityResponse = {
  analytics: OrdersSalesChannelPopularityResult
}

function transformToPopularityTable(result: OrdersSalesChannelPopularityResult): PopularityTableRow[] {
  const currentMap = new Map<string, number>();
  const previousMap = new Map<string, number>();

  result.current.forEach(currentItem => {
    const currentCount = currentMap.get(currentItem.salesChannelName) || 0;
    currentMap.set(currentItem.salesChannelName, currentCount + parseInt(currentItem.orderCount));
  });

  result.previous.forEach(previousItem => {
    const previousCount = previousMap.get(previousItem.salesChannelName) || 0;
    previousMap.set(previousItem.salesChannelName, previousCount + parseInt(previousItem.orderCount));
  });

  return Array.from(currentMap.keys()).map(name => ({
    name,
    current: String(currentMap.get(name) || 0),
    previous: String(previousMap.get(name) || 0)
  }));
}

const SalesChannelsPopularityDetails = ({orderStatuses, dateRange, dateRangeCompareTo, compareEnabled} : {
  orderStatuses: OrderStatus[], dateRange?: DateRange, dateRangeCompareTo?: DateRange, compareEnabled?: boolean}) => {

  const [data, setData] = useState<OrdersSalesChannelPopularityResponse | undefined>(undefined)

  const [error, setError] = useState<any>(undefined);

  const [isLoading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true);
  }, [dateRange, dateRangeCompareTo, orderStatuses])

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    fetch(`${API_BASE_URL}/admin/sales-analytics/sales-channels-popularity?${deduceDateUrlParams(dateRange, dateRangeCompareTo, orderStatuses).toString()}` , {
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
      <TableContainer component={Paper} elevation={0} sx={{ background: 'transparent' }}>
        <Table size="small" aria-label="loading sales channel popularity">
          <TableBody>
            {Array.from({ length: 5 }).map((_, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <Skeleton variant="text" width={220} />
                </TableCell>
                <TableCell align="left">
                  <Skeleton variant="text" width={28} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
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
    return <PopularityTable valueColumnName="Orders" tableRows={transformToPopularityTable(data.analytics)} enableComparing={compareEnabled && dateRangeCompareTo !== undefined}/>
  } else {
    return <Heading level="h3">No orders</Heading>
  }
}

export const SalesChannelPopularityCard = ({orderStatuses, dateRange, dateRangeCompareTo, compareEnabled} :
  {orderStatuses: OrderStatus[], dateRange?: DateRange, dateRangeCompareTo?: DateRange, compareEnabled: boolean}) => {
  return (
    <div style={{ display: 'grid', gap: 12, paddingBottom: 8 }}>
      <div style={{ display: 'grid' }}>
        <Stack direction="row" spacing={1.5} alignItems={'center'}>
          <ShoppingBag/>
          <Heading level="h2">Sales channel popularity</Heading>
        </Stack>
      </div>
      <div style={{ display: 'grid' }}>
        <SalesChannelsPopularityDetails orderStatuses={orderStatuses} dateRange={dateRange} dateRangeCompareTo={dateRangeCompareTo} compareEnabled={compareEnabled}/>
      </div>
    </div>
  )
}