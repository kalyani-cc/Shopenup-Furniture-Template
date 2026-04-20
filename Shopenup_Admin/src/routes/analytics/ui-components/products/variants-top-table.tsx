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
import { Avatar, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from "@mui/material";
import { Link } from "react-router-dom"

export type VariantsTopTableRow = {
  sum: string,
  productId: string,
  productTitle: string,
  variantTitle: string,
  thumbnail: string,
}

export const VariantsTopTable = ({tableRows} : {tableRows: VariantsTopTableRow[]}) => {
  return (
    <TableContainer component={Paper} elevation={0} sx={{ background: 'transparent' }}>
      <Table size="small" aria-label="top variants table">
        <TableHead>
          <TableRow>
            <TableCell>
              <Heading level="h3">Variant</Heading>
            </TableCell>
            <TableCell align="right">
              <Heading level="h3">Count</Heading>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tableRows.length > 0 ? (
            tableRows.map((tableRow, index) => (
              <TableRow hover key={`${tableRow.productId}-${index}`}>
                <TableCell>
                  <Link to={`../products/${tableRow.productId}`}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      {tableRow.thumbnail ? (
                        <Avatar
                          variant="rounded"
                          src={tableRow.thumbnail}
                          alt={`Thumbnail for ${tableRow.productTitle}`}
                          sx={{ width: 36, height: 36 }}
                        />
                      ) : (
                        <Avatar variant="rounded" sx={{ width: 36, height: 36 }} />
                      )}
                      <Text>
                        {tableRow.productTitle} - {tableRow.variantTitle}
                      </Text>
                    </Stack>
                  </Link>
                </TableCell>
                <TableCell align="right">
                  <Text>{tableRow.sum}</Text>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={2}>
                <Stack direction="row" justifyContent="space-between">
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