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
import { VariantsTopTable, VariantsTopTableRow } from "./variants-top-table";
import { deduceDateUrlParams } from "../utils/helpers";
const API_BASE_URL = import.meta.env.VITE_SHOPENUP_BACKEND_URL || "";
import { useEffect, useState } from "react";

// removed unused AdminProductsStatisticsQuery type

type VariantsCountPopularity = {
  sum: string,
  productId: string,
  variantId: string,
  productTitle: string,
  variantTitle: string,
  thumbnail: string,
}

type VariantsCountPopularityResult = {
  dateRangeFrom?: number
  dateRangeTo?: number,
  dateRangeFromCompareTo?: number,
  dateRangeToCompareTo?: number,
  current: VariantsCountPopularity[],
  previous: VariantsCountPopularity[] | undefined
}

type VariantsCountPopularityResponse = {
  analytics: VariantsCountPopularityResult
}

function transformToVariantTopTable(result: VariantsCountPopularityResult): VariantsTopTableRow[] {
  const currentMap = new Map<string, VariantsTopTableRow>();

  result.current.forEach(currentItem => {
    let currentCount = '0';
    if (currentMap.get(currentItem.variantId)) {
      const sum = currentMap.get(currentItem.variantId)?.sum;
      if (sum) {
        currentCount = sum;
      }
    }
    currentMap.set(currentItem.variantId, {
      productId: currentItem.productId,
      productTitle: currentItem.productTitle,
      variantTitle: currentItem.variantTitle,
      thumbnail: currentItem.thumbnail,
      sum: (parseInt(currentCount) + parseInt(currentItem.sum)).toString()
    });
  });

  return Array.from(currentMap.values());
}

const VariantsTopByCount = ({orderStatuses, dateRange, dateRangeCompareTo, compareEnabled: _compareEnabled} : {
  orderStatuses: OrderStatus[], dateRange?: DateRange, dateRangeCompareTo?: DateRange, compareEnabled?: boolean}) => {

  const [data, setData] = useState<VariantsCountPopularityResponse | undefined>(undefined)

  const [error, setError] = useState<any>(undefined);

  const [isLoading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true);
  }, [dateRange, dateRangeCompareTo, orderStatuses])

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    fetch(`${API_BASE_URL}/admin/products-analytics/popularity-by-count?${deduceDateUrlParams(dateRange, dateRangeCompareTo, orderStatuses).toString()}` , {
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
        <Table size="small" aria-label="loading top variants">
          <TableBody>
            {Array.from({ length: 5 }).map((_, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <Skeleton variant="rounded" width={220} height={28} />
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

  if (data && data.analytics == undefined) {
    return <Heading level="h3">Cannot get orders or products</Heading>
  }

  if (data && data.analytics.dateRangeFrom) {
    return <VariantsTopTable tableRows={transformToVariantTopTable(data.analytics)}/>
  } else {
    return <Heading level="h3">No products for selected orders</Heading>
  }
}

export const VariantsTopByCountCard = ({orderStatuses, dateRange, dateRangeCompareTo, compareEnabled} :
  {orderStatuses: OrderStatus[], dateRange?: DateRange, dateRangeCompareTo?: DateRange, compareEnabled: boolean}) => {
  return (
    <div style={{ display: 'grid', gap: 12, paddingBottom: 8 }}>
      <div style={{ display: 'grid' }}>
        <Stack direction="row" spacing={1.5} alignItems={'center'}>
          <ShoppingBag/>
          <Heading level="h2">Top variants</Heading>
        </Stack>
      </div>
      <div style={{ display: 'grid' }}>
        <VariantsTopByCount orderStatuses={orderStatuses} dateRange={dateRange} dateRangeCompareTo={dateRangeCompareTo} compareEnabled={compareEnabled}/>
      </div>
    </div>
  )
}