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

import { Heading, Alert, Tooltip, TooltipProvider } from "@shopenup/ui";
import { ArrowRightOnRectangle, InformationCircle } from "@shopenup/icons";
import { Grid, Skeleton, Table, TableBody, TableCell, TableContainer, TableRow, Paper, Stack } from "@mui/material";
import { OutOfTheStockVariantsTable } from "./out-of-the-stock-variants-table";
import { OutOfTheStockVariantsModal } from "./out-of-the-stock-variants-all";
import { OutOfTheStockVariantsCountResponse, transformToVariantTopTable } from "./helpers";
import { useEffect, useState } from "react";
const API_BASE_URL = import.meta.env.VITE_SHOPENUP_BACKEND_URL || "";

const OutOfTheStockVariants = () => {

  const [data, setData] = useState<OutOfTheStockVariantsCountResponse | undefined>(undefined)

  const [error, setError] = useState<any>(undefined);

  const [isLoading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const params: URLSearchParams = new URLSearchParams({
      limit: '5'
    })

    fetch(`${API_BASE_URL}/admin/products-analytics/out-of-the-stock-variants?${params.toString()}` , {
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
        <Table size="small" aria-label="loading out of stock variants">
          <TableBody>
            {Array.from({ length: 5 }).map((_, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <Skeleton variant="rounded" width={220} height={28} />
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
    return <Heading level="h3">Cannot get variants</Heading>
  }

  return <OutOfTheStockVariantsTable tableRows={transformToVariantTopTable(data.analytics)}/>
}

export const OutOfTheStockVariantsCard = () => {
  return (
    <div style={{ display: 'grid', gap: 12, paddingBottom: 8 }}>
      <div style={{ display: 'grid' }}>
        <Stack direction="row" spacing={1.5} alignItems={'center'}>
          <ArrowRightOnRectangle/>
          <Heading level="h2">Out of the stock variants</Heading>
          <TooltipProvider>
            <Tooltip content='It includes only published products and not gift cards'>
              <InformationCircle />
            </Tooltip>
          </TooltipProvider>
        </Stack>
      </div>
      <div style={{ display: 'grid' }}>
        <Stack direction={'row'} spacing={2} alignItems={'center'}>
          <Heading level="h3">Last 5 variants</Heading>
          <OutOfTheStockVariantsModal/>
        </Stack>
      </div>
      <div style={{ display: 'grid' }}>
        <OutOfTheStockVariants/>
      </div>
    </div>
  )
}