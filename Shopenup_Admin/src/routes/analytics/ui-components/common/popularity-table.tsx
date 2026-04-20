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

import { Heading, Text, Tooltip, TooltipProvider } from "@shopenup/ui";
import { Grid, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import { IconComparison } from "./icon-comparison";

const ValueColumn = ({current, previous, enableComparing} : {current: string, previous?: string, enableComparing?: boolean}) => {
  return (
    <Grid container alignItems={'center'}>
      {enableComparing ? 
        <TooltipProvider>
          <Tooltip content={`Previously: ${previous}`}>
          <span>
              <Text style={ { textDecorationStyle: 'dotted', textDecorationLine: 'underline', textUnderlineOffset: '3px'}}>
                {current !== undefined ? `${current}` : `N/A`}
              </Text>
            </span>
          </Tooltip>
        </TooltipProvider>
      :
      <Grid item>
        <Text>
          {current}
        </Text>
      </Grid>
      }
      {enableComparing && 
      <Grid item>
        <Grid container alignItems={'center'}>
          {parseInt(current) != (previous ? parseInt(previous) : undefined) && <Grid item>
            <IconComparison current={parseInt(current)} previous={previous ? parseInt(previous) : undefined}/>
          </Grid>
          }
        </Grid>
      </Grid>
      }
    </Grid>
  )
}

export type PopularityTableRow = {
  name: string,
  current: string
  previous: string | undefined
}

export const PopularityTable = ({valueColumnName, tableRows, enableComparing} : {valueColumnName: string, tableRows: PopularityTableRow[], enableComparing?: boolean}) => {
  return (
    <TableContainer component={Paper} elevation={0} sx={{ background: 'transparent' }}>
      <Table size="small" aria-label="popularity table">
        <TableHead>
          <TableRow>
            <TableCell>
              <Heading level="h3">Name</Heading>
            </TableCell>
            <TableCell align="right">
              <Heading level="h3">{valueColumnName}</Heading>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tableRows.length > 0 ? (
            tableRows.map((tableRow) => (
              <TableRow hover key={tableRow.name}>
                <TableCell>
                  <Text>{tableRow.name}</Text>
                </TableCell>
                <TableCell align="right">
                  <ValueColumn current={tableRow.current} previous={tableRow.previous} enableComparing={enableComparing}/>
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