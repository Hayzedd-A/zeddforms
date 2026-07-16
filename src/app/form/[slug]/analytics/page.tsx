'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Download,
  Calendar,
  Users,
  Clock,
  TrendingUp,
  BarChart3,
  PieChart,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react'
import { formatDate, calculatePercentage } from '@/lib/utils'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  Pie
} from 'recharts'
import { formatDuration } from '@/lib/analytics'

interface AnalyticsData {
  overview: {
    totalResponses: number
    completedResponses: number
    draftResponses: number
    partialResponses: number
    completionRate: number
    averageTime: number
  }
  trends: {
    responsesByDate: Array<{ date: string; responses: number }>
  }
  demographics: {
    devices: Array<{ device: string; count: number }>
    browsers: Array<{ browser: string; count: number }>
    operatingSystems: Array<{ os: string; count: number }>
    locations: Array<{ country: string; count: number }>
  }
  fieldAnalytics: Array<{
    fieldId: string
    label: string
    type: string
    responseCount: number
    responseRate: number
    valueDistribution?: Array<{ value: string; count: number; percentage: number }>
    average?: number
    min?: number
    max?: number
    correctRate?: number
  }>
  scoringAnalytics?: {
    averageScore: number
    highestScore: number
    lowestScore: number
    passingRate: number
    gradeDistribution: Array<{ grade: string; count: number; percentage: number }>
  }
  form: {
    title: string
    createdAt: string
    settings: any
  }
}

// Data-visualization palette — a separate, qualitative scale from the UI
// accent color, wired to the --chart-1..5 tokens defined in globals.css.
const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'var(--popover)',
  borderColor: 'var(--border)',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  color: 'var(--popover-foreground)',
}

const CHART_AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 12 }

function AnalyticsSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
              <div className="space-y-2">
                <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
                <div className="h-4 w-32 animate-pulse rounded-md bg-muted" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-40 animate-pulse rounded-md bg-muted" />
              <div className="h-10 w-32 animate-pulse rounded-md bg-muted" />
              <div className="h-10 w-32 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto space-y-8 px-4 py-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 animate-pulse rounded-md bg-muted" />
                <div className="h-4 w-4 animate-pulse rounded-md bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-7 w-16 animate-pulse rounded-md bg-muted" />
                <div className="mt-2 h-3 w-20 animate-pulse rounded-md bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="h-5 w-40 animate-pulse rounded-md bg-muted" />
            <div className="mt-1 h-4 w-56 animate-pulse rounded-md bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full animate-pulse rounded-md bg-muted" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-5 w-32 animate-pulse rounded-md bg-muted" />
                <div className="mt-1 h-4 w-48 animate-pulse rounded-md bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full animate-pulse rounded-md bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function FormAnalytics() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    fetchAnalytics();
  }, [session, status, router, slug, period]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(
        `/api/forms/${slug}/analytics?period=${period}`
      );
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (format: "csv" | "json") => {
    try {
      const response = await fetch(
        `/api/forms/${slug}/export?format=${format}`
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${slug}-responses.${format}`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error exporting data:", error);
    }
  };

  if (status === "loading" || loading) {
    return <AnalyticsSkeleton />;
  }

  if (!session || !analytics) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  {analytics.form.title}
                </h1>
                <p className="text-muted-foreground">Analytics Dashboard</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => exportData("csv")}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={() => exportData("json")}>
                <Download className="w-4 h-4 mr-2" />
                Export JSON
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Responses
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.overview.totalResponses}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.overview.completedResponses} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completion Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.overview.completionRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.overview.draftResponses} drafts,{" "}
                {analytics.overview.partialResponses} partial
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Average Time
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatDuration(analytics.overview.averageTime)}
              </div>
              <p className="text-xs text-muted-foreground">Time to complete</p>
            </CardContent>
          </Card>

          {analytics.scoringAnalytics && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Score
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.scoringAnalytics.averageScore}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics.scoringAnalytics.passingRate}% passing rate
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Response Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Response Trends</CardTitle>
            <CardDescription>
              Daily response count over the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.trends.responsesByDate}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    tick={CHART_AXIS_TICK}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString()
                    }
                  />
                  <YAxis tick={CHART_AXIS_TICK} allowDecimals={false} />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString()
                    }
                    formatter={(value) => [value, "Responses"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="responses"
                    stroke={CHART_COLORS[0]}
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS[0] }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Demographics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Device Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Device Types</CardTitle>
              <CardDescription>
                Distribution of devices used to submit responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={analytics.demographics.devices}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(props: any) => `${props.device}: ${props.count}`}
                      outerRadius={80}
                      fill={CHART_COLORS[0]}
                      dataKey="count"
                      nameKey="device"
                    >
                      {analytics.demographics.devices.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Browser Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Browsers</CardTitle>
              <CardDescription>Most popular browsers used</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.demographics.browsers.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="browser" tick={CHART_AXIS_TICK} />
                    <YAxis tick={CHART_AXIS_TICK} allowDecimals={false} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assignment Mode Analytics */}
        {analytics.scoringAnalytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Grade Distribution</CardTitle>
                <CardDescription>
                  Distribution of grades received
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics.scoringAnalytics.gradeDistribution}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="grade" tick={CHART_AXIS_TICK} />
                      <YAxis tick={CHART_AXIS_TICK} allowDecimals={false} />
                      <Tooltip
                        contentStyle={CHART_TOOLTIP_STYLE}
                        formatter={(value) => [value, "Students"]}
                      />
                      <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Score Statistics</CardTitle>
                <CardDescription>Detailed scoring breakdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Average Score:</span>
                  <span className="text-sm">
                    {analytics.scoringAnalytics.averageScore}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Highest Score:</span>
                  <span className="text-sm">
                    {analytics.scoringAnalytics.highestScore}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Lowest Score:</span>
                  <span className="text-sm">
                    {analytics.scoringAnalytics.lowestScore}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Passing Rate:</span>
                  <span className="text-sm">
                    {analytics.scoringAnalytics.passingRate}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Field Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Field Performance</CardTitle>
            <CardDescription>
              Response rates and performance for each field
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {analytics.fieldAnalytics.map((field) => (
                <div
                  key={field.fieldId}
                  className="rounded-lg border border-border p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-foreground">{field.label}</h4>
                      <p className="text-sm text-muted-foreground capitalize">
                        {field.type.replace("-", " ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-foreground">
                        {field.responseRate}% response rate
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {field.responseCount} responses
                      </div>
                    </div>
                  </div>

                  {/* Multiple Choice / Dropdown Distribution */}
                  {field.valueDistribution && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium mb-2 text-foreground">
                        Response Distribution
                      </h5>
                      <div className="space-y-2">
                        {field.valueDistribution
                          .slice(0, 5)
                          .map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm truncate flex-1 mr-2">
                                {item.value}
                              </span>
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-2 rounded-full bg-muted">
                                  <div
                                    className="h-2 rounded-full bg-primary transition-[width] duration-200 ease-out"
                                    style={{ width: `${item.percentage}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground w-12 text-right">
                                  {item.count} ({item.percentage}%)
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Numeric Field Statistics */}
                  {field.average !== undefined && (
                    <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Average:</span>
                        <div className="font-medium text-foreground">{field.average}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Min:</span>
                        <div className="font-medium text-foreground">{field.min}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Max:</span>
                        <div className="font-medium text-foreground">{field.max}</div>
                      </div>
                    </div>
                  )}

                  {/* Assignment Mode Correct Rate */}
                  {field.correctRate !== undefined && (() => {
                    const tier =
                      field.correctRate >= 70
                        ? "strong"
                        : field.correctRate >= 50
                        ? "moderate"
                        : "weak";
                    const tierConfig = {
                      strong: {
                        label: "Strong",
                        Icon: CheckCircle2,
                        color: "hsl(var(--chart-2))",
                      },
                      moderate: {
                        label: "Needs review",
                        Icon: AlertTriangle,
                        color: "hsl(var(--chart-4))",
                      },
                      weak: {
                        label: "At risk",
                        Icon: XCircle,
                        color: "var(--destructive)",
                      },
                    }[tier];
                    return (
                      <div className="mt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Correct Rate:
                          </span>
                          <span
                            className="flex items-center gap-1.5 text-sm font-medium"
                            style={{ color: tierConfig.color }}
                          >
                            <tierConfig.Icon className="h-3.5 w-3.5" aria-hidden="true" />
                            {field.correctRate}% &middot; {tierConfig.label}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-muted mt-1">
                          <div
                            className="h-2 rounded-full transition-[width] duration-200 ease-out"
                            style={{
                              width: `${field.correctRate}%`,
                              backgroundColor: tierConfig.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Geographic Distribution */}
        {analytics.demographics.locations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Geographic Distribution</CardTitle>
              <CardDescription>Responses by country</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analytics.demographics.locations
                  .slice(0, 6)
                  .map((location, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <span className="font-medium text-foreground">{location.country}</span>
                      <span className="text-sm text-muted-foreground">
                        {location.count} responses
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

