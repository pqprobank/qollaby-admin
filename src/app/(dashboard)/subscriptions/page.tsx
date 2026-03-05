"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getSubscriptionStats,
  getActivityTrend,
  SubscriptionStats,
  ActivityTrend,
} from "@/lib/subscription-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw,
  PieChart as PieChartIcon,
  Activity,
  CalendarDays,
  ChevronDown,
  Check,
  BarChart3,
  CreditCard,
} from "lucide-react";

// Generate year options (last 5 years)
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

// Month options
const MONTHS = [
  { value: 1, label: "January", short: "Jan" },
  { value: 2, label: "February", short: "Feb" },
  { value: 3, label: "March", short: "Mar" },
  { value: 4, label: "April", short: "Apr" },
  { value: 5, label: "May", short: "May" },
  { value: 6, label: "June", short: "Jun" },
  { value: 7, label: "July", short: "Jul" },
  { value: 8, label: "August", short: "Aug" },
  { value: 9, label: "September", short: "Sep" },
  { value: 10, label: "October", short: "Oct" },
  { value: 11, label: "November", short: "Nov" },
  { value: 12, label: "December", short: "Dec" },
];

export default function SubscriptionsPage() {
  // Subscription states
  const [subLoading, setSubLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(true);
  const [subStats, setSubStats] = useState<SubscriptionStats | null>(null);
  const [activityTrend, setActivityTrend] = useState<ActivityTrend | null>(null);

  // Date selection state
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(now.getDate());

  // Get days in current month
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const DAYS = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const fetchSubStats = useCallback(async () => {
    setSubLoading(true);
    try {
      const data = await getSubscriptionStats();
      setSubStats(data);
    } catch (error) {
      console.error("Failed to fetch subscription stats:", error);
    } finally {
      setSubLoading(false);
    }
  }, []);

  const fetchActivityTrend = useCallback(async () => {
    setTrendLoading(true);
    try {
      const data = await getActivityTrend(selectedYear, selectedMonth, selectedDay);
      setActivityTrend(data);
    } catch (error) {
      console.error("Failed to fetch activity trend:", error);
    } finally {
      setTrendLoading(false);
    }
  }, [selectedYear, selectedMonth, selectedDay]);

  useEffect(() => {
    fetchSubStats();
  }, [fetchSubStats]);

  useEffect(() => {
    fetchActivityTrend();
  }, [fetchActivityTrend]);

  // When year/month changes, adjust day to ensure it doesn't exceed range
  useEffect(() => {
    const maxDay = new Date(selectedYear, selectedMonth, 0).getDate();
    if (selectedDay > maxDay) {
      setSelectedDay(maxDay);
    }
  }, [selectedYear, selectedMonth, selectedDay]);

  const handleRefreshSub = async () => {
    await Promise.all([fetchSubStats(), fetchActivityTrend()]);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title="Subscriptions"
        description="Monitor subscription metrics and revenue"
        icon={CreditCard}
        children={
        <div className="flex items-center gap-2 flex-wrap">
          {/* Year Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-secondary/50 border-border/50 min-w-[100px]"
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                {selectedYear}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border/50">
              {YEARS.map((year) => (
                <DropdownMenuItem
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className="cursor-pointer"
                >
                  {selectedYear === year && <Check className="h-4 w-4 mr-2" />}
                  <span className={selectedYear !== year ? "ml-6" : ""}>{year}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Month Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-secondary/50 border-border/50 min-w-[120px]"
              >
                {MONTHS.find((m) => m.value === selectedMonth)?.label}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-card border-border/50 max-h-[300px] overflow-y-auto"
            >
              {MONTHS.map((month) => (
                <DropdownMenuItem
                  key={month.value}
                  onClick={() => setSelectedMonth(month.value)}
                  className="cursor-pointer"
                >
                  {selectedMonth === month.value && <Check className="h-4 w-4 mr-2" />}
                  <span className={selectedMonth !== month.value ? "ml-6" : ""}>
                    {month.label}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Day Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-secondary/50 border-border/50 min-w-[80px]"
              >
                Day {selectedDay}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-card border-border/50 max-h-[300px] overflow-y-auto"
            >
              {DAYS.map((day) => (
                <DropdownMenuItem
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className="cursor-pointer"
                >
                  {selectedDay === day && <Check className="h-4 w-4 mr-2" />}
                  <span className={selectedDay !== day ? "ml-6" : ""}>{day}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshSub}
            disabled={subLoading || trendLoading}
            className="bg-secondary/50 border-border/50"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${subLoading || trendLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
        }
      />

      {/* Activity Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Daily Active Users Card with Mini Chart */}
        <Card className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-violet-500/20 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Daily Active (DAU)
            </CardTitle>
            <Activity className="h-5 w-5 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                {trendLoading ? (
                  <Skeleton className="h-10 w-20" />
                ) : (
                  <div className="text-4xl font-bold text-violet-500">
                    {activityTrend?.totalDailyActive || 0}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedYear}-{String(selectedMonth).padStart(2, "0")}-
                  {String(selectedDay).padStart(2, "0")}
                </p>
              </div>
              {/* Mini Sparkline */}
              {!trendLoading && activityTrend && (
                <MiniBarChart
                  data={activityTrend.dailyTrend.slice(0, selectedDay).slice(-14)}
                  color="#8b5cf6"
                  highlightIndex={Math.min(selectedDay - 1, 13)}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Active Users Card with Mini Chart */}
        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Active (MAU)
            </CardTitle>
            <CalendarDays className="h-5 w-5 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                {trendLoading ? (
                  <Skeleton className="h-10 w-20" />
                ) : (
                  <div className="text-4xl font-bold text-cyan-500">
                    {activityTrend?.totalMonthlyActive || 0}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {MONTHS.find((m) => m.value === selectedMonth)?.label} {selectedYear}
                </p>
              </div>
              {/* Mini Line Chart */}
              {!trendLoading && activityTrend && (
                <MiniLineChart data={activityTrend.monthlyTrend} color="#06b6d4" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Trend Chart */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-violet-500" />
            Daily Active Trend - {MONTHS.find((m) => m.value === selectedMonth)?.label}{" "}
            {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Skeleton className="h-full w-full rounded-lg" />
            </div>
          ) : activityTrend && activityTrend.dailyTrend.length > 0 ? (
            <DailyBarChart data={activityTrend.dailyTrend} selectedDay={selectedDay} />
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Trend Chart */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-cyan-500" />
            Monthly Active Trend (Last 6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Skeleton className="h-full w-full rounded-lg" />
            </div>
          ) : activityTrend && activityTrend.monthlyTrend.length > 0 ? (
            <MonthlyAreaChart data={activityTrend.monthlyTrend} />
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Active Users */}
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Subscribers
            </CardTitle>
            <Users className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {subLoading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <div className="text-4xl font-bold text-emerald-500">
                {subStats?.activeUsers || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Total active subscriptions</p>
          </CardContent>
        </Card>

        {/* Churn Rate */}
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Churn Rate
            </CardTitle>
            <TrendingDown className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            {subLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <div className="text-4xl font-bold text-amber-500">
                {(subStats?.churnRate || 0).toFixed(1)}%
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {subStats?.churnedUsers || 0} users scheduled to cancel
            </p>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 border-rose-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Revenue
            </CardTitle>
            <DollarSign className="h-5 w-5 text-rose-500" />
          </CardHeader>
          <CardContent>
            {subLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <div className="text-4xl font-bold text-rose-500">
                $
                {(subStats?.monthlyRevenue || 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Estimated recurring revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Pie Chart */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-primary" />
            Revenue by Tier
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subLoading ? (
            <div className="flex items-center justify-center h-80">
              <Skeleton className="h-64 w-64 rounded-full" />
            </div>
          ) : subStats && subStats.revenueByTier.length > 0 ? (
            <div className="flex flex-col lg:flex-row items-center justify-center gap-8 py-4">
              {/* Pie Chart SVG */}
              <PieChart data={subStats.revenueByTier} />

              {/* Legend */}
              <div className="flex flex-col gap-3">
                {subStats.revenueByTier.map((tier) => (
                  <div key={tier.planId} className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: tier.color }}
                    />
                    <span className="text-sm font-medium min-w-[100px]">{tier.planName}</span>
                    <span className="text-sm text-muted-foreground">
                      $
                      {tier.revenue.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      ({tier.count} users)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-80 text-muted-foreground">
              <PieChartIcon className="h-16 w-16 mb-4 opacity-30" />
              <p>No subscription data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Mini Bar Chart for DAU sparkline
function MiniBarChart({
  data,
  color,
  highlightIndex,
}: {
  data: { day: number; count: number }[];
  color: string;
  highlightIndex: number;
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const barWidth = 6;
  const gap = 2;
  const height = 40;
  const width = data.length * (barWidth + gap);

  return (
    <svg width={width} height={height} className="opacity-80">
      {data.map((item, index) => {
        const barHeight = (item.count / maxCount) * (height - 4);
        const isHighlight = index === highlightIndex;
        return (
          <rect
            key={item.day}
            x={index * (barWidth + gap)}
            y={height - barHeight - 2}
            width={barWidth}
            height={Math.max(barHeight, 2)}
            rx={2}
            fill={isHighlight ? color : `${color}50`}
            className="transition-all duration-200"
          />
        );
      })}
    </svg>
  );
}

// Mini Line Chart for MAU sparkline
function MiniLineChart({ data, color }: { data: { month: number; count: number }[]; color: string }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const height = 40;
  const width = 100;
  const padding = 4;

  const points = data.map((item, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * (width - padding * 2);
    const y = height - padding - (item.count / maxCount) * (height - padding * 2);
    return { x, y, count: item.count };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x || 0} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <svg width={width} height={height} className="opacity-80">
      <defs>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#areaGradient)" />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === points.length - 1 ? 4 : 2}
          fill={i === points.length - 1 ? color : `${color}80`}
        />
      ))}
    </svg>
  );
}

// Full Daily Bar Chart
function DailyBarChart({
  data,
  selectedDay,
}: {
  data: { day: number; date: string; count: number }[];
  selectedDay: number;
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const height = 200;
  const barWidth = Math.max(8, Math.min(20, 800 / data.length - 4));
  const gap = 4;

  return (
    <div className="overflow-x-auto pb-4">
      <div
        className="flex items-end justify-center gap-1 min-w-fit px-4"
        style={{ height }}
      >
        {data.map((item) => {
          const barHeight = (item.count / maxCount) * (height - 40);
          const isSelected = item.day === selectedDay;
          const isToday = item.date === new Date().toISOString().split("T")[0];

          return (
            <div
              key={item.day}
              className="flex flex-col items-center group"
              style={{ width: barWidth + gap }}
            >
              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-1 text-xs font-medium text-violet-500 whitespace-nowrap">
                {item.count}
              </div>
              {/* Bar */}
              <div
                className={`rounded-t-md transition-all duration-200 ${
                  isSelected
                    ? "bg-violet-500 shadow-lg shadow-violet-500/30"
                    : isToday
                    ? "bg-violet-400"
                    : "bg-violet-500/40 hover:bg-violet-500/60"
                }`}
                style={{
                  width: barWidth,
                  height: Math.max(barHeight, 4),
                }}
              />
              {/* Day label */}
              <span
                className={`text-xs mt-2 ${
                  isSelected ? "text-violet-500 font-bold" : "text-muted-foreground"
                }`}
              >
                {item.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Monthly Area Chart
function MonthlyAreaChart({
  data,
}: {
  data: { year: number; month: number; label: string; count: number }[];
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const height = 260;
  const width = 600;
  const padding = { top: 50, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const points = data.map((item, index) => {
    const x = padding.left + (index / (data.length - 1 || 1)) * chartWidth;
    const y = padding.top + chartHeight - (item.count / maxCount) * chartHeight;
    return { x, y, ...item };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x || padding.left} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

  // Y-axis ticks
  const yTicks = [0, Math.round(maxCount / 2), maxCount];

  return (
    <div className="flex justify-center overflow-x-auto">
      <svg width={width} height={height} className="min-w-[400px]">
        <defs>
          <linearGradient id="monthlyAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((tick, i) => {
          const y = padding.top + chartHeight - (tick / maxCount) * chartHeight;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="hsl(var(--border))"
                strokeOpacity="0.3"
                strokeDasharray="4,4"
              />
              <text
                x={padding.left - 10}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-xs"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Area */}
        <path d={areaPath} fill="url(#monthlyAreaGradient)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#06b6d4"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points and labels */}
        {points.map((p, i) => (
          <g key={i}>
            {/* Point glow */}
            <circle cx={p.x} cy={p.y} r={8} fill="#06b6d4" fillOpacity="0.2" />
            {/* Point */}
            <circle
              cx={p.x}
              cy={p.y}
              r={5}
              fill="#06b6d4"
              stroke="hsl(var(--card))"
              strokeWidth="2"
            />
            {/* Value label */}
            <text x={p.x} y={p.y - 20} textAnchor="middle" className="fill-cyan-500 text-sm font-bold">
              {p.count}
            </text>
            {/* X-axis label */}
            <text x={p.x} y={height - 10} textAnchor="middle" className="fill-muted-foreground text-xs">
              {p.label.split(" ")[0]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// Pie Chart Component
interface PieChartProps {
  data: {
    planId: string;
    planName: string;
    revenue: number;
    color: string;
  }[];
}

function PieChart({ data }: PieChartProps) {
  const total = data.reduce((acc, d) => acc + d.revenue, 0);
  if (total === 0) return null;

  const size = 280;
  const center = size / 2;
  const radius = 100;
  const innerRadius = 60;

  let currentAngle = -90;

  const slices = data.map((item) => {
    const percentage = (item.revenue / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    // Outer arc
    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    // Inner arc
    const ix1 = center + innerRadius * Math.cos(startRad);
    const iy1 = center + innerRadius * Math.sin(startRad);
    const ix2 = center + innerRadius * Math.cos(endRad);
    const iy2 = center + innerRadius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    // Donut path
    const pathD = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix2} ${iy2}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}`,
      "Z",
    ].join(" ");

    return {
      ...item,
      pathD,
      percentage,
    };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((slice) => (
        <path
          key={slice.planId}
          d={slice.pathD}
          fill={slice.color}
          stroke="hsl(var(--card))"
          strokeWidth="2"
          className="transition-all duration-300 hover:opacity-80 cursor-pointer"
          style={{
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
          }}
        >
          <title>
            {slice.planName}: ${slice.revenue.toLocaleString()} ({slice.percentage.toFixed(1)}%)
          </title>
        </path>
      ))}
      {/* Center text */}
      <text x={center} y={center - 8} textAnchor="middle" className="fill-foreground text-lg font-bold">
        $
        {total.toLocaleString("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}
      </text>
      <text x={center} y={center + 12} textAnchor="middle" className="fill-muted-foreground text-xs">
        Total Revenue
      </text>
    </svg>
  );
}
