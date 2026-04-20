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

import { Heading, Container, Text } from "@shopenup/ui";
import { calculateResolution, getChartDateName, getChartTooltipDate, getLegendName, ChartResolutionType, compareDatesBasedOnResolutionType } from "./utils/chartUtils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend} from 'recharts';
import { useEffect, useState } from 'react';
import { Box } from "@mui/material";
import { ResponsiveContainer } from "recharts";
import { useMediaQuery } from "../../../../hooks/use-media-query";


type ChartDataPoint = {
  current: {
    date: Date,
    value: any
  },
  previous: {
    date: Date,
    value: any
  }
}

export type ChartDataType = {
  current: {
    date: Date,
    value: any
  }[],
  previous: {
    date: Date,
    value: any
  }[]
}

const incrementDate = (date: Date, resolutionType: ChartResolutionType) => {
  switch (resolutionType) {
    case ChartResolutionType.DayMonth:
      date.setDate(date.getDate() + 1);
      break;
    case ChartResolutionType.Month:
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      date.setDate(date.getDate() + 1);
  }
};

const generateChartData = (
  data: ChartDataType,
  fromDate: Date,
  toDate: Date,
  chartResolutionType: ChartResolutionType, 
  toCompareDate?: Date,
  connectEmptyPointsUsingPreviousValue?: boolean) 
  : ChartDataPoint[] => {

  const currentData = data.current;
  const previousData = data.previous;

  const startFromDate = new Date(fromDate);
  const offsetTime = toDate.getTime() - (toCompareDate ? toCompareDate.getTime() : fromDate.getTime());

  const dataPoints: ChartDataPoint[] = [];
  let currentDataValue: any;
  let previousDataValue: any;

  while (startFromDate.getTime() < toDate.getTime() || compareDatesBasedOnResolutionType(startFromDate, toDate, chartResolutionType)) {
    const currentOrder = currentData.find(order => compareDatesBasedOnResolutionType(new Date(order.date), startFromDate, chartResolutionType));
    const offsetDate = new Date(startFromDate);
    offsetDate.setTime(offsetDate.getTime() - offsetTime);
    const previousOrder = previousData.find(previous => compareDatesBasedOnResolutionType(new Date(previous.date), offsetDate, chartResolutionType));

    if (connectEmptyPointsUsingPreviousValue) {
      if (currentOrder) {
        currentDataValue = parseInt(currentOrder.value);
      }
      if (previousOrder) {
        previousDataValue = parseInt(previousOrder.value);
      }

      dataPoints.push({
        current: {
          date: new Date(startFromDate),
          value: currentOrder ? parseInt(currentOrder.value) : (currentDataValue ? currentDataValue : undefined),
        },
        previous: {
          date: new Date(offsetDate),
          value: previousOrder ? parseInt(previousOrder.value) : (previousDataValue ? previousDataValue : undefined),
        }
      });
    } else {
      dataPoints.push({
        current: {
          date: new Date(startFromDate),
          value: currentOrder ? parseInt(currentOrder.value) : 0
        },
        previous: {
          date: new Date(offsetDate),
          value: previousOrder ? parseInt(previousOrder.value) : 0,
        }
      });
    }

    incrementDate(startFromDate, chartResolutionType);
  }

  if (connectEmptyPointsUsingPreviousValue) {
    for (let i = dataPoints.length - 1; i >= 0; i--) {
      if (dataPoints[i].current.value === undefined) {
        if (dataPoints[dataPoints.length - 1].previous.value) {
          dataPoints[i].current.value = dataPoints[dataPoints.length - 1].previous.value
        } else {
          dataPoints[i].current.value = 0;
        }
      }
      if (dataPoints[i].previous.value) {
        previousDataValue = dataPoints[i].previous.value
      } else {
        dataPoints[i].previous.value = previousDataValue;
      }
    }
  }

  return dataPoints;
}

type TooltipPayload = {
  color?: string;
  payload: ChartDataPoint;
};

type ChartCustomTooltipProps = {
  active?: boolean;
  payload?: readonly TooltipPayload[] | readonly any[];
  label?: string | number;
  resolutionType: ChartResolutionType;
};

export const ChartCustomTooltip = ({ active, payload, resolutionType }: ChartCustomTooltipProps) => {
  if (active && payload && payload.length) {
    switch (resolutionType) {
      case ChartResolutionType.DayMonth:
        return (
          <Container>
            <Heading level="h3" style={ { color: payload[0].color}}>
              {`${getChartTooltipDate(payload[0].payload.current.date, resolutionType)}`} : {payload[0].payload.current.value}
            </Heading>
            {payload[1] !== undefined && 
              <Heading level="h3" style={ { color: payload[1].color}}>
                {`${getChartTooltipDate(payload[1].payload.previous.date, resolutionType)}`} : {payload[1].payload.previous.value}
              </Heading>
            }
            </Container>
        )
      case ChartResolutionType.Month:
        return (
          <Container>
            <Heading level="h3" style={ { color: payload[0].color}}>
              {`${getChartTooltipDate(payload[0].payload.current.date, resolutionType)}`} : {payload[0].payload.current.value}
            </Heading>
            {payload[1] !== undefined && 
              <Heading level="h3" style={ { color: payload[1].color}}>
                {`${getChartTooltipDate(payload[1].payload.previous.date, resolutionType)}`} : {payload[1].payload.previous.value}
              </Heading>
            }
            </Container>
        )
    }
      
  }
  return null;
};

/* 

toDate is inclusive. It means that:
  fromDate: "2024-04-24"
  toDate: "2024-04-30"

  Analytics shall include `toDate` so it takes 7 days (including 2024-04-30)

  fromCompareDate: "2024-04-17"
  toCompareDate: "2024-04-24"

  Analytics shall compare to 7 days excluding 2024-04-24 (e.g. 2024-04-30 is compared to 2024-04-23, not 2024-04-24).

  toDate is inclusive to cover "today" date - so we need to cover situation when someone wants to see everything until now.
  We cannot use 2024-05-01 because then it is taken as day to show, while we want to show maximum 2024-04-30.

  toCompareDate is exclusive because backend is using fetches like created_at < toCompareDate, so it does not cover data at toCompareDate

  Comparison then we will have following algorithm:
  1) Take "toDate", remove "time" part and add whole day.
  2) Take times in milis from every date and compare.
*/

const areRangesTheSame = (fromDate: Date, toDate: Date, fromCompareDate?: Date, toCompareDate?: Date) : boolean => {

  function isToday(date: Date) : boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const givenDate = new Date(date);
    givenDate.setHours(0, 0, 0, 0);
    return today.getTime() === givenDate.getTime();
  }

  if (fromCompareDate) {
    const oneDay = 24 * 60 * 60 * 1000;
    if (toCompareDate) {

      // Cover situation when toDate is today so gives jsut couple of hours while we need the whole day.
      if (isToday(toDate)) {
        const diffBase = Math.ceil(Math.abs((toDate.getTime() - fromDate.getTime()) / oneDay));
        const diffCompare = Math.round(Math.abs((toCompareDate.getTime() - fromCompareDate.getTime()) / oneDay));
        return (diffBase == diffCompare);
      }
      const diffBase = Math.round(Math.abs((toDate.getTime() - fromDate.getTime()) / oneDay));
      const diffCompare = Math.round(Math.abs((toCompareDate.getTime() - fromCompareDate.getTime()) / oneDay));
      return (diffBase == diffCompare);
    }

    const diffBase = Math.ceil(Math.abs((toDate.getTime() - fromDate.getTime()) / oneDay));
    const diffCompare = Math.ceil(Math.abs((Date.now() - fromCompareDate.getTime()) / oneDay));

    return (diffBase == diffCompare);
  }
  return true;
};

export const ChartCurrentPrevious = ({
  rawChartData,
  fromDate,
  toDate,
  fromCompareDate,
  toCompareDate,
  compareEnabled,
  connectEmptyPointsUsingPreviousValue
}: {
  rawChartData: ChartDataType,
  fromDate: Date,
  toDate: Date,
  fromCompareDate?: Date,
  toCompareDate?: Date,
  compareEnabled?: boolean,
  connectEmptyPointsUsingPreviousValue?: boolean
}) => {

  const [chartDataPoints, setChartData] = useState<ChartDataPoint[]>([]);

  const resolutionType = calculateResolution(fromDate, toDate);

  // Breakpoints
  const isMobile = useMediaQuery("(max-width: 640px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");
  const isLargeScreen = useMediaQuery("(min-width: 1440px)");

  // Responsive Chart Height
  const chartHeight = isMobile ? 240 : isTablet ? 320 : isLargeScreen ? 420 : 380;

  // Responsive Margins
  const chartMargins = isMobile
    ? { top: 10, right: 5, left: -10, bottom: 40 }
    : isTablet
    ? { top: 20, right: 10, left: -5, bottom: 30 }
    : { top: 20, right: 0, left: 0, bottom: 20 };

  // X-Axis Tick Gap
  const xAxisTickGap = isMobile ? 35 : isTablet ? 20 : 10;

  // Y-Axis Width
  const yAxisWidth = isMobile ? 35 : isTablet ? 50 : 60;

  // Fetch data
  useEffect(() => {
    const chartDataPoints: ChartDataPoint[] = generateChartData(
      rawChartData,
      fromDate,
      toDate,
      resolutionType,
      toCompareDate,
      connectEmptyPointsUsingPreviousValue
    );
    setChartData(chartDataPoints);
  }, [rawChartData, fromDate, toDate]);

  // Ranges mismatch UI
  if (!areRangesTheSame(fromDate, toDate, fromCompareDate, toCompareDate)) {
    const currentPeriodInDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (24*60*60*1000));
    let precedingPeriodInDays = 0;

    if (fromCompareDate) {
      if (toCompareDate) {
        precedingPeriodInDays = Math.ceil((toCompareDate.getTime() - fromCompareDate.getTime()) / (24*60*60*1000));
      } else {
        precedingPeriodInDays = Math.ceil((new Date(Date.now()).getTime() - fromCompareDate.getTime()) / (24*60*60*1000));
      }
    }

    return (
      <Box
        width="100%"
        height={chartHeight}
        display="flex"
        justifyContent="center"
        alignItems="center"
        sx={{
          maxWidth: "100%",
          padding: isMobile ? "14px" : "20px"
        }}
      >
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          textAlign: "center",
          padding: isMobile ? "0 12px" : "0"
        }}>
          <Text style={{ fontSize: isMobile ? "14px" : "16px" }}>
            Chart can be shown only for the same length of ranges.
          </Text>
          <Text style={{ fontSize: isMobile ? "12px" : "14px" }}>
            You are comparing {currentPeriodInDays} days to {precedingPeriodInDays} days
          </Text>
        </div>
      </Box>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: chartHeight,
        minHeight: isMobile ? 240 : 300,
        overflow: "hidden",
        position: "relative",
        zIndex: 2
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartDataPoints} margin={chartMargins}>
          <CartesianGrid strokeDasharray="3 3" />

          {/* Gradients */}
          <defs>
            <linearGradient id="colorPrevious" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
            </linearGradient>
          </defs>

          {/* X Axis */}
          <XAxis
            dataKey={(value: ChartDataPoint) =>
              getChartDateName(value.current.date, resolutionType, fromDate, toDate)
            }
            minTickGap={xAxisTickGap}
            interval="preserveStartEnd"
            tick={{
              fontSize: isMobile ? 9 : isTablet ? 11 : 12
            }}
            angle={isMobile ? -40 : 0}
            textAnchor={isMobile ? "end" : "middle"}
            height={isMobile ? 55 : 40}
          />

          {/* Y Axis */}
          <YAxis
            width={yAxisWidth}
            tick={{ fontSize: isMobile ? 10 : 12 }}
            tickMargin={5}
          />

          {/* Tooltip */}
          <Tooltip
            wrapperStyle={{ outline: "none" }}
            content={(props) => (
              <ChartCustomTooltip {...props} resolutionType={resolutionType} />
            )}
          />

          {/* Current */}
          <Area
            name={compareEnabled && fromCompareDate ? getLegendName(true) : undefined}
            type="monotone"
            dataKey="current.value"
            stroke="#82ca9d"
            fill="url(#colorCurrent)"
            fillOpacity={1}
          />

          {/* Previous */}
          {compareEnabled && fromCompareDate && (
            <Area
              name={getLegendName(false)}
              type="monotone"
              dataKey="previous.value"
              stroke="#8884d8"
              fill="url(#colorPrevious)"
              fillOpacity={1}
            />
          )}

          {/* Legend */}
          {compareEnabled && fromCompareDate && (
            <Legend
              verticalAlign="bottom"
              height={isMobile ? 30 : 40}
              iconType="circle"
              wrapperStyle={{
                fontSize: isMobile ? "11px" : "14px",
                paddingTop: isMobile ? 6 : 10,
                lineHeight: "14px"
              }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
