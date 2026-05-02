"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DataPoint {
  interview_id: string;
  overall_communication_score: number | null;
  overall_content_score: number | null;
  overall_confidence_score: number | null;
  created_at: string;
}

export function ScoreTrendChart({ data }: { data: DataPoint[] }) {
  const sorted = [...data].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const series = sorted.map((d, i) => ({
    n: i + 1,
    Communication: d.overall_communication_score ?? 0,
    Content: d.overall_content_score ?? 0,
    Confidence: d.overall_confidence_score ?? 0,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <LineChart data={series} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis dataKey="n" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--card))",
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="Communication" stroke="#0ea5e9" strokeWidth={2} dot />
          <Line type="monotone" dataKey="Content" stroke="#8b5cf6" strokeWidth={2} dot />
          <Line type="monotone" dataKey="Confidence" stroke="#22c55e" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
