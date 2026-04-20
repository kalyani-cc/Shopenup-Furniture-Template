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

import { Heading, Text } from "@shopenup/ui";
import { Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";

export type DiscountsTopTableRow = {
  sum: string,
  discountCode: string
}

export const DiscountsTopTable = ({tableRows} : {tableRows: DiscountsTopTableRow[]}) => {
  return (
    <TableContainer component={Paper} elevation={0} sx={{ background: 'transparent' }}>
      <Table size="small" aria-label="top discounts table">
        <TableHead>
          <TableRow>
            <TableCell>
              <Heading level="h3">Discount</Heading>
            </TableCell>
            <TableCell align="right">
              <Heading level="h3">Count</Heading>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tableRows.length > 0 ? (
            tableRows.map((row, idx) => (
              <TableRow hover key={`${row.discountCode}-${idx}`}>
                <TableCell>
                  <Text>{row.discountCode}</Text>
                </TableCell>
                <TableCell align="right">
                  <Text>{row.sum}</Text>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={2}>
                <Stack direction="row" justifyContent={'space-between'}>
                  <Text>None</Text>
                  <Text>None</Text>
                </Stack>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}