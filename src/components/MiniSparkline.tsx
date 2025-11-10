import { LineChart, Line, ResponsiveContainer } from "recharts";

interface MiniSparklineProps {
  data: number[];
  color?: string;
  className?: string;
}

export function MiniSparkline({ data, color = "hsl(var(--primary))", className }: MiniSparklineProps) {
  const chartData = data.map((value, index) => ({ value, index }));

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={40}>
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
