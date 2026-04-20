"use client"

// --------------------------------------
// COUNTRY + STATE MAPPING (LOCAL)
// --------------------------------------
const COUNTRY_MAP: Record<string, string> = {
  IN: "India",
  US: "United States",
  AE: "United Arab Emirates",
  UK: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
  SG: "Singapore",
};

// Only India is needed for now
const INDIA_STATE_MAP: Record<string, string> = {
  MH: "Maharashtra",
  GJ: "Gujarat",
  DL: "Delhi",
  KA: "Karnataka",
  TN: "Tamil Nadu",
  KL: "Kerala",
  RJ: "Rajasthan",
  UP: "Uttar Pradesh",
  MP: "Madhya Pradesh",
  PB: "Punjab",
  HR: "Haryana",
  WB: "West Bengal",
  BR: "Bihar",
  OR: "Odisha",
  AP: "Andhra Pradesh",
  TG: "Telangana",
  JK: "Jammu & Kashmir",
  CH: "Chandigarh",
  GA: "Goa",
  AN: "Andaman & Nicobar Islands",
};

// 🔥 City Color Palette (More colors to avoid clashes)
const CITY_COLORS = [
  "#1E40AF",
  "#0284C7",
  "#0EA5E9",
  "#06B6D4",
  "#10B981",
  "#16A34A",
  "#65A30D",
  "#CA8A04",
  "#EA580C",
  "#DC2626",
  "#DB2777",
  "#8B5CF6",
  "#6366F1",
];

// --------------------------------------
// HELPERS
// --------------------------------------
const getStateName = (fullCode?: string) => {
  if (!fullCode) return "";
  const parts = fullCode.split("-");
  const stateCode = parts[1];
  return INDIA_STATE_MAP[stateCode] || stateCode || "Unknown State";
};

const getCountryName = (fullCode?: string) => {
  if (!fullCode) return "";
  const countryCode = fullCode.split("-")[0];
  return COUNTRY_MAP[countryCode] || countryCode || "Unknown Country";
};

// --------------------------------------
// COMPONENT
// --------------------------------------
import React, { useMemo } from "react";
import { useInventoryMovement } from "../../../../../hooks/api/use-dashboard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const InventoryMovement: React.FC = () => {
  const { data, isLoading, isError, error } = useInventoryMovement();

  // =============================================================
  // GROUP PRODUCTS BY LOCATION OR CITY
  // =============================================================
  const products = useMemo(() => {
    if (!data?.items || data.items.length === 0) return [];

    interface LocationData {
      sold: number;
      total: number;
      count: number;
    }

    const map = new Map<
      string,
      {
        name: string;
        locations: Record<string, LocationData>;
      }
    >();

    for (const item of data.items) {
      if (!map.has(item.product_id)) {
        map.set(item.product_id, {
          name: item.product_name,
          locations: {},
        });
      }

      const p = map.get(item.product_id);
      if (!p) continue;

      for (const layer of item.layers || []) {
        let locationName = layer.location_name;

        // Convert IN-MH → Maharashtra inside frontend also (safety)
        if (locationName?.includes("-")) {
          locationName = getStateName(locationName);
        }

        if (!p.locations[locationName]) {
          p.locations[locationName] = {
            sold: 0,
            total: 0,
            count: 0,
          };
        }

        p.locations[locationName].sold += layer.sold_quantity || 0;
        p.locations[locationName].total += layer.total_inventory || 0;
        p.locations[locationName].count += layer.stock_location_count || 0;
      }
    }

    return [...map.values()];
  }, [data]);

  // =============================================================
  // PREPARE CHART DATA
  // =============================================================
  const chartData = useMemo(() => {
    return products.map((p) => {
      const flat: Record<string, any> = { name: p.name };

      Object.entries(p.locations).forEach(([loc, vals]: [string, { sold: number; total: number; count: number }]) => {
        flat[loc] = vals.sold;
        flat[`${loc}_total`] = vals.total;
        flat[`${loc}_count`] = vals.count;
      });

      return flat;
    });
  }, [products]);

  // =============================================================
  // LIST OF ALL LOCATION KEYS
  // =============================================================
  const allLocations = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) =>
      Object.keys(p.locations).forEach((l) => set.add(l))
    );
    return [...set];
  }, [products]);

  const chartWidth = Math.max(products.length * 160, 800);

  // =============================================================
  // LOADING + ERROR HANDLING
  // =============================================================
  if (isLoading)
    return <div className="p-6 text-center">Loading inventory movement…</div>;

  if (isError)
    return (
      <div className="p-6 text-center text-red-600">
        Error: {error?.message}
      </div>
    );

  if (products.length === 0)
    return (
      <div className="p-6 text-center text-gray-500">
        No inventory movement data available.
      </div>
    );

  // =============================================================
  // RENDER CHART
  // =============================================================
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">
        Inventory Movement by Location / City
      </h3>

      <div className="w-full overflow-x-auto">
        <div style={{ minWidth: chartWidth }}>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />

              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 12 }}
                interval={0}
              />

              <YAxis
                allowDecimals={false} // ⛔ NO DECIMAL Y-AXIS
                tickFormatter={(value) => String(value)
} // ⛔ Always whole numbers
                domain={["auto", "auto"]}
                label={{
                  value: "Quantity",
                  angle: -90,
                  position: "insideLeft",
                }}
              />

              <Tooltip
                formatter={(value, name, props) => {
                  const total = props.payload[`${name}_total`];
                  return [`${value}/${total}`, name];
                }}
              />

              <Legend wrapperStyle={{ paddingTop: "12px" }} />

              {allLocations.map((loc, idx) => (
                <Bar
                  key={loc}
                  dataKey={loc}
                  stackId="inventory"
                  fill={CITY_COLORS[idx % CITY_COLORS.length]}
                  name={loc}
                  radius={idx === allLocations.length - 1 ? [6, 6, 0, 0] : 0}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default InventoryMovement;
