import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ForecastPoint } from "../types/air";
import { formatHour, formatTime } from "../lib/format";

export default function TrendChart({
  forecast,
  timezone,
}: {
  forecast: ForecastPoint[];
  timezone?: string | null;
}) {
  const data = forecast
    .filter((point) => point.aqi !== null)
    .map((point) => ({
      time: formatHour(point.time, timezone),
      aqi: point.aqi,
      fullTime: formatTime(point.time, timezone),
    }));
  if (data.length === 0)
    return <div className="chart-empty">Forecast values are unavailable.</div>;
  return (
    <>
      <div
        className="chart"
        role="img"
        aria-label="Modelled AQI forecast for the next hours"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
          >
            <CartesianGrid
              stroke="#e8ece7"
              strokeDasharray="3 5"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#80908a", fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#80908a", fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                borderColor: "#e5ebe5",
                boxShadow: "0 8px 24px #20352b12",
              }}
              formatter={(value) => [value, "US AQI"]}
              labelFormatter={(label, items) =>
                items[0]?.payload.fullTime ?? label
              }
            />
            <Line
              type="monotone"
              dataKey="aqi"
              stroke="#387b64"
              strokeWidth={3}
              dot={{ r: 3, fill: "#387b64", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="data-table-details">
        <summary>View forecast data table</summary>
        <div className="table-wrap">
          <table>
            <caption className="sr-only">
              Hourly forecasted United States Air Quality Index
            </caption>
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">US AQI</th>
              </tr>
            </thead>
            <tbody>
              {data.map((point) => (
                <tr key={point.fullTime}>
                  <td>{point.fullTime}</td>
                  <td>{point.aqi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
