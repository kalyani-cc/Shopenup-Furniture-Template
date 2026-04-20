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
import { Skeleton, Table, TableBody, TableCell, TableContainer, TableRow, Paper, Stack } from "@mui/material";
import type { DateRange } from "../utils/types";
import { OrderStatus } from "../utils/types";
import { DiscountsTopTable, DiscountsTopTableRow } from "./discounts-top-table";
import { useEffect, useState } from "react";
import { deduceDateUrlParams } from "../utils/helpers";
const API_BASE_URL = import.meta.env.VITE_SHOPENUP_BACKEND_URL || "";

type DiscountsCountPopularity = {
  sum: string,
  discountId: string,
  discountCode: string,
}

type DiscountsCountPopularityResult = {
  dateRangeFrom?: number
  dateRangeTo?: number,
  dateRangeFromCompareTo?: number,
  dateRangeToCompareTo?: number,
  current: DiscountsCountPopularity[],
  previous: DiscountsCountPopularity[] | undefined
}

type DiscountsCountPopularityResponse = {
  analytics: DiscountsCountPopularityResult
}

function transformToDiscountsTopTable(result: DiscountsCountPopularityResult): DiscountsTopTableRow[] {
  const currentMap = new Map<string, DiscountsTopTableRow>();

  result.current.forEach(currentItem => {
    let currentCount = '0';
    if (currentMap.get(currentItem.discountId)) {
      const sum = currentMap.get(currentItem.discountId)?.sum;
      if (sum) {
        currentCount = sum;
      }
    }
    currentMap.set(currentItem.discountId, {
      discountCode: currentItem.discountCode,
      sum: (parseInt(currentCount) + parseInt(currentItem.sum)).toString()
    });
  });

  return Array.from(currentMap.values());
}

const DiscountsTopByCount = ({orderStatuses, dateRange, dateRangeCompareTo} : {
  orderStatuses: OrderStatus[], dateRange?: DateRange, dateRangeCompareTo?: DateRange}) => {

  const [data, setData] = useState<DiscountsCountPopularityResponse | undefined>(undefined)

  const [error, setError] = useState<any>(undefined);

  const [isLoading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true);
  }, [dateRange, dateRangeCompareTo, orderStatuses])

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    fetch(`${API_BASE_URL}/admin/marketing-analytics/discounts-by-count?${deduceDateUrlParams(dateRange, dateRangeCompareTo, orderStatuses).toString()}` , {
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
        <Table size="small" aria-label="loading discounts">
          <TableBody>
            {Array.from({ length: 5 }).map((_, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <Skeleton variant="text" width={160} />
                </TableCell>
                <TableCell align="right">
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

  if (data == undefined || data.analytics == undefined) {
    return <Heading level="h3">Cannot get orders or discounts</Heading>
  }

  if (data.analytics.dateRangeFrom) {
    return <DiscountsTopTable tableRows={transformToDiscountsTopTable(data.analytics)}/>
  } else {
    return <Heading level="h3">No discounts for selected orders</Heading>
  }
}

export const DiscountsTopCard = ({orderStatuses, dateRange, dateRangeCompareTo} :
  {orderStatuses: OrderStatus[], dateRange?: DateRange, dateRangeCompareTo?: DateRange}) => {
  return (
    <div style={{ display: 'grid', gap: 12, paddingBottom: 8 }}>
      <div style={{ display: 'grid' }}>
        <Stack direction="row" spacing={1.5} alignItems={'center'}>
          <ShoppingBag/>
          <Heading level="h2">Top discounts</Heading>
        </Stack>
      </div>
      <div style={{ display: 'grid' }}>
        <DiscountsTopByCount orderStatuses={orderStatuses} dateRange={dateRange} dateRangeCompareTo={dateRangeCompareTo}/>
      </div>
    </div>
  )
}