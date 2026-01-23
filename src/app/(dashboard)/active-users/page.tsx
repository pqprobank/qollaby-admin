"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  UserPlus,
  CalendarDays,
  ChevronDown,
  Check,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import {
  getRegistrationStats,
  getDailyRegistrationTrend,
  getMonthlyRegistrationTrend,
  RegistrationStats,
  DailyRegistrationTrend,
  MonthlyRegistrationTrend,
} from "@/lib/user-actions";

// Date selectors
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

// Mini bar chart for daily trend
function DailyBarChart({ data }: { data: DailyRegistrationTrend[] }) {
  if (!data || data.length === 0) return null;

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const chartHeight = 60;
  const barWidth = 100 / data.length;

  return (
    <div className="w-full h-16 mt-2">
      <svg width="100%" height={chartHeight} className="overflow-visible">
        {data.map((item, index) => {
          const barHeight = (item.count / maxCount) * (chartHeight - 10);
          const x = index * barWidth;
          return (
            <g key={item.day}>
              <rect
                x={`${x}%`}
                y={chartHeight - barHeight - 5}
                width={`${barWidth * 0.8}%`}
                height={barHeight}
                fill="rgb(139, 92, 246)"
                opacity={0.6}
                rx={2}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Mini area chart for monthly trend
function MonthlyAreaChart({ data }: { data: MonthlyRegistrationTrend[] }) {
  if (!data || data.length === 0) return null;

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const chartHeight = 80;
  const chartWidth = 100;
  const padding = { top: 20, bottom: 10, left: 5, right: 5 };

  const points = data.map((item, index) => {
    const x =
      padding.left +
      (index / (data.length - 1)) * (chartWidth - padding.left - padding.right);
    const y =
      padding.top +
      (1 - item.count / maxCount) * (chartHeight - padding.top - padding.bottom);
    return { x, y, count: item.count, month: item.month };
  });

  const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPoints = `${padding.left},${chartHeight - padding.bottom} ${linePoints} ${chartWidth - padding.right},${chartHeight - padding.bottom}`;

  return (
    <div className="w-full h-24 mt-2">
      <svg
        width="100%"
        height={chartHeight}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="regAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#regAreaGradient)" />
        <polyline
          points={linePoints}
          fill="none"
          stroke="rgb(59, 130, 246)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point, index) => (
          <g key={index}>
            <circle cx={point.x} cy={point.y} r="3" fill="rgb(59, 130, 246)" />
            <text
              x={point.x}
              y={point.y - 8}
              textAnchor="middle"
              className="text-[8px] fill-blue-500 font-medium"
            >
              {point.count}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function ActiveUsersPage() {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  const [stats, setStats] = useState<RegistrationStats | null>(null);
  const [dailyTrend, setDailyTrend] = useState<DailyRegistrationTrend[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyRegistrationTrend[]>([]);

  // Check if the current view matches today's date
  const today = new Date();
  const isViewingCurrentMonth =
    selectedYear === today.getFullYear() && selectedMonth === today.getMonth() + 1;

  const [statsLoading, setStatsLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await getRegistrationStats(
        selectedYear,
        selectedMonth,
        selectedDay
      );
      setStats(data);
    } catch (error) {
      console.error("Error fetching registration stats:", error);
    } finally {
      setStatsLoading(false);
    }
  }, [selectedYear, selectedMonth, selectedDay]);

  const fetchTrends = useCallback(async () => {
    setTrendLoading(true);
    try {
      const [daily, monthly] = await Promise.all([
        getDailyRegistrationTrend(selectedYear, selectedMonth),
        getMonthlyRegistrationTrend(selectedYear),
      ]);
      setDailyTrend(daily);
      setMonthlyTrend(monthly);
    } catch (error) {
      console.error("Error fetching trends:", error);
    } finally {
      setTrendLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    fetchStats();
    fetchTrends();
  }, [fetchStats, fetchTrends]);

  const handleRefresh = () => {
    fetchStats();
    fetchTrends();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UserPlus className="h-7 w-7 text-primary" />
            Active Users
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor user registration and growth trends
          </p>
        </div>
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
                  <span className={selectedYear !== year ? "ml-6" : ""}>
                    {year}
                  </span>
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
                  {selectedMonth === month.value && (
                    <Check className="h-4 w-4 mr-2" />
                  )}
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
            onClick={handleRefresh}
            disabled={statsLoading || trendLoading}
            className="bg-secondary/50 border-border/50"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${statsLoading || trendLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <div className="text-4xl font-bold text-primary">
                {stats?.totalUsers.toLocaleString() || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              All registered users
            </p>
          </CardContent>
        </Card>

        {/* Daily Registrations */}
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Daily Registrations
            </CardTitle>
            <UserPlus className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <div className="text-4xl font-bold text-emerald-500">
                {stats?.dailyRegistrations.toLocaleString() || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {selectedMonth}/{selectedDay}/{selectedYear}
            </p>
          </CardContent>
        </Card>

        {/* Monthly Registrations */}
        <Card className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-violet-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Registrations
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-violet-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <div className="text-4xl font-bold text-violet-500">
                {stats?.monthlyRegistrations.toLocaleString() || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {MONTHS.find((m) => m.value === selectedMonth)?.label} {selectedYear}
            </p>
          </CardContent>
        </Card>

        {/* Yearly Registrations */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Yearly Registrations
            </CardTitle>
            <CalendarDays className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <div className="text-4xl font-bold text-blue-500">
                {stats?.yearlyRegistrations.toLocaleString() || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Year {selectedYear}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Daily Registration Trend */}
        <Card className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-violet-500/20 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Daily Registration Trend
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                {trendLoading ? (
                  <Skeleton className="h-10 w-20" />
                ) : (
                  <>
                    <div className="text-3xl font-bold text-violet-500">
                      {dailyTrend.reduce((sum, d) => sum + d.count, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total in {MONTHS.find((m) => m.value === selectedMonth)?.label}
                    </p>
                  </>
                )}
              </div>
              <div className="w-2/3">
                {trendLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <DailyBarChart data={dailyTrend} />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Registration Trend */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Registration Trend
            </CardTitle>
            <CalendarDays className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                {trendLoading ? (
                  <Skeleton className="h-10 w-20" />
                ) : (
                  <>
                    <div className="text-3xl font-bold text-blue-500">
                      {monthlyTrend.reduce((sum, d) => sum + d.count, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total in {selectedYear}
                    </p>
                  </>
                )}
              </div>
              <div className="w-2/3">
                {trendLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : (
                  <MonthlyAreaChart data={monthlyTrend} />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Registration Details Table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-primary" />
            Daily Breakdown - {MONTHS.find((m) => m.value === selectedMonth)?.label} {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <div className="space-y-2">
              {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {dailyTrend.map((item) => {
                // Only highlight if viewing current month and the day matches selected day
                const isHighlighted =
                  isViewingCurrentMonth && item.day === selectedDay;
                return (
                  <div
                    key={item.day}
                    className={`p-2 rounded-lg text-center transition-all ${
                      item.count > 0
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-secondary/30 border border-border/30"
                    } ${
                      isHighlighted
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : ""
                    }`}
                  >
                    <div className="text-xs text-muted-foreground">Day {item.day}</div>
                    <div
                      className={`text-lg font-bold ${
                        item.count > 0 ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {item.count}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
