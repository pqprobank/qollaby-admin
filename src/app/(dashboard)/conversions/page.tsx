"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getConversionRateData,
  ConversionRateData,
  ConversionRateItem,
} from "@/lib/user-actions";
import { getAllCategories, getCategoryLabel, getSubCategoryLabel, Category } from "@/lib/category-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  RefreshCw,
  FolderTree,
  Tag,
  MapPin,
  Building2,
  Eye,
  MousePointer,
  Megaphone,
} from "lucide-react";

export default function ConversionsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ConversionRateData | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getConversionRateData();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch conversion data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    getAllCategories().then(setAllCategories);
  }, [fetchData]);

  // Calculate overall stats
  const overallStats = data
    ? {
        totalViews: data.byCategory.reduce((sum, item) => sum + item.totalViews, 0),
        totalClicks: data.byCategory.reduce((sum, item) => sum + item.totalClicks, 0),
        totalAds: data.byCategory.reduce((sum, item) => sum + item.adCount, 0),
      }
    : { totalViews: 0, totalClicks: 0, totalAds: 0 };

  const overallRate =
    overallStats.totalViews > 0
      ? (overallStats.totalClicks / overallStats.totalViews) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Conversion Rate"
        description="Analyze ad conversion rates by different dimensions"
        icon={TrendingUp}
        children={
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            className="bg-secondary/50 border-border/50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-500/10">
                <TrendingUp className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overall Rate</p>
                <div className="text-2xl font-bold text-orange-500">
                  {loading ? <Skeleton className="h-8 w-16" /> : `${overallRate.toFixed(2)}%`}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Eye className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Views</p>
                <div className="text-2xl font-bold">
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    overallStats.totalViews.toLocaleString()
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <MousePointer className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Clicks</p>
                <div className="text-2xl font-bold">
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    overallStats.totalClicks.toLocaleString()
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Megaphone className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Ads</p>
                <div className="text-2xl font-bold">
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    overallStats.totalAds.toLocaleString()
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All dimensions displayed */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FolderTree className="h-5 w-5 text-primary" />
              By Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ConversionTable
              items={data?.byCategory || []}
              loading={loading}
              labelFormatter={(name) => getCategoryLabel(allCategories, name)}
            />
          </CardContent>
        </Card>

        {/* Subcategory */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Tag className="h-5 w-5 text-primary" />
              By Subcategory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ConversionTable
              items={data?.bySubcategory || []}
              loading={loading}
              labelFormatter={(name) => {
                const label = getSubCategoryLabel(allCategories, name);
                return label !== name ? label : name.replace(/-/g, " ");
              }}
            />
          </CardContent>
        </Card>

        {/* State */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              By State
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ConversionTable
              items={data?.byState || []}
              loading={loading}
              labelFormatter={(name) => name}
            />
          </CardContent>
        </Card>

        {/* City */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              By City
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ConversionTable
              items={data?.byCity || []}
              loading={loading}
              labelFormatter={(name) => name}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface ConversionTableProps {
  items: ConversionRateItem[];
  loading: boolean;
  labelFormatter: (name: string) => string;
}

function ConversionTable({ items, loading, labelFormatter }: ConversionTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        // Use actual percentage (0-100) for bar width
        const barWidth = Math.min(item.conversionRate, 100);
        const isTopThree = index < 3 && item.conversionRate > 0;
        
        return (
          <div
            key={item.name}
            className="group relative bg-secondary/20 rounded-lg p-3 hover:bg-secondary/40 transition-colors border border-border/20"
          >
            <div className="flex items-center justify-between mb-2">
              {/* Label and rank */}
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  isTopThree ? "bg-primary/20 text-primary" : "bg-secondary/50 text-muted-foreground"
                }`}>
                  #{index + 1}
                </span>
                <span className="font-medium text-foreground text-sm">
                  {labelFormatter(item.name)}
                </span>
              </div>
              {/* Conversion rate */}
              <span className={`text-lg font-bold ${
                item.conversionRate > 0 ? "text-primary" : "text-muted-foreground"
              }`}>
                {item.conversionRate.toFixed(1)}%
              </span>
            </div>

            {/* Progress bar - fills by actual percentage */}
            <div className="relative h-1.5 bg-secondary/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  item.conversionRate > 0
                    ? "bg-gradient-to-r from-primary/60 to-primary"
                    : "bg-transparent"
                }`}
                style={{ width: `${barWidth}%` }}
              />
            </div>

            {/* Stats row - more compact */}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>{item.adCount} ads</span>
              <span>{item.totalViews.toLocaleString()} views</span>
              <span>{item.totalClicks.toLocaleString()} clicks</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
