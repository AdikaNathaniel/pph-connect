import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, XAxis, Tooltip } from "recharts";
import { TrendingUp } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface AreaChartGradientProps {
  data: { date: string; answers: number }[];
}

const chartConfig = {
  answers: {
    label: "Answers",
    color: "hsl(var(--primary))", // Use primary color
  },
} satisfies ChartConfig;

export function AreaChartGradient({ data }: AreaChartGradientProps) {
  const totalAnswers = data.reduce((sum, item) => sum + item.answers, 0);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Answers Inserted</CardTitle>
        <CardDescription>
          Showing {totalAnswers} total answers inserted for the last 14 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[370px] w-full">
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <defs>
              <linearGradient id="fillAnswers" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-answers)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-answers)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey="answers"
              type="natural"
              fill="url(#fillAnswers)"
              fillOpacity={0.4}
              stroke="var(--color-answers)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
