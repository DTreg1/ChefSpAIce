/**
 * Accessibility Dashboard Component
 * 
 * Displays comprehensive accessibility reports and metrics for images.
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  TrendingUp,
  Image as ImageIcon,
  Award,
  BarChart3,
  Eye
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

interface AccessibilityDashboardProps {
  userId?: string;
  dateRange?: { start: Date; end: Date };
}

export function AccessibilityDashboard({ userId, dateRange }: AccessibilityDashboardProps) {
  // Fetch accessibility report
  const reportQuery = useQuery({
    queryKey: ["/api/images/report", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange) {
        params.append("startDate", dateRange.start.toISOString());
        params.append("endDate", dateRange.end.toISOString());
      }
      const url = `/api/images/report${params.toString() ? `?${params}` : ""}`;
      return fetch(url).then(res => res.json());
    }
  });

  const report = reportQuery.data?.data;

  if (reportQuery.isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p>No accessibility data available</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const coverageData = [
    { name: "With Alt Text", value: report.imagesWithAltText, color: "#10b981" },
    { name: "Without Alt Text", value: report.totalImages - report.imagesWithAltText - report.decorativeImages, color: "#ef4444" },
    { name: "Decorative", value: report.decorativeImages, color: "#6b7280" }
  ];

  const wcagData = [
    { level: "A", count: report.wcagCompliance.A, color: "#fbbf24" },
    { level: "AA", count: report.wcagCompliance.AA, color: "#60a5fa" },
    { level: "AAA", count: report.wcagCompliance.AAA, color: "#10b981" }
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Total Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.totalImages}</div>
            <Progress 
              value={(report.imagesWithAltText / report.totalImages) * 100} 
              className="mt-2 h-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((report.imagesWithAltText / report.totalImages) * 100)}% have alt text
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Quality Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(report.averageQualityScore)}`}>
              {Math.round(report.averageQualityScore)}%
            </div>
            <Badge 
              variant={getScoreBadgeVariant(report.averageQualityScore)}
              className="mt-2"
            >
              {report.averageQualityScore >= 80 ? "Excellent" :
               report.averageQualityScore >= 60 ? "Good" : "Needs Work"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Accessibility Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(report.averageAccessibilityScore)}`}>
              {Math.round(report.averageAccessibilityScore)}%
            </div>
            <div className="flex gap-1 mt-2">
              {report.averageAccessibilityScore >= 90 ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : report.averageAccessibilityScore >= 70 ? (
                <AlertCircle className="w-4 h-4 text-yellow-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <span className="text-xs text-muted-foreground">
                WCAG Compliance
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="w-4 h-4" />
              WCAG Levels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Badge variant="outline">A: {report.wcagCompliance.A}</Badge>
              <Badge variant="secondary">AA: {report.wcagCompliance.AA}</Badge>
              <Badge>AAA: {report.wcagCompliance.AAA}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {report.wcagCompliance.AAA > 0 ? "Great job!" : "Room to improve"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Charts */}
      <Tabs defaultValue="coverage" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="coverage" data-testid="tab-coverage">Coverage</TabsTrigger>
          <TabsTrigger value="compliance" data-testid="tab-compliance">WCAG Compliance</TabsTrigger>
          <TabsTrigger value="improvements" data-testid="tab-improvements">Improvements</TabsTrigger>
        </TabsList>

        <TabsContent value="coverage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alt Text Coverage</CardTitle>
              <CardDescription>
                Distribution of images with and without alt text
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={coverageData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {coverageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>WCAG Compliance Levels</CardTitle>
              <CardDescription>
                Distribution of images by WCAG compliance level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={wcagData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="level" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8">
                    {wcagData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="improvements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Images Needing Improvement</CardTitle>
              <CardDescription>
                {report.needsImprovement.length} images have quality scores below 70%
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report.needsImprovement.length > 0 ? (
                <div className="space-y-3">
                  {report.needsImprovement.slice(0, 5).map((image: any) => (
                    <div 
                      key={image.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {image.imageUrl && (
                          <img 
                            src={image.imageUrl} 
                            alt={image.altText || "No alt text"}
                            className="w-12 h-12 rounded object-cover"
                          />
                        )}
                        <div>
                          <p className="text-sm font-medium">
                            {image.title || `Image ${image.id.slice(0, 8)}...`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {image.altText ? 
                              (image.altText.length > 50 ? 
                                `${image.altText.slice(0, 50)}...` : 
                                image.altText) : 
                              "No alt text"
                            }
                          </p>
                        </div>
                      </div>
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Needs Review
                      </Badge>
                    </div>
                  ))}
                  {report.needsImprovement.length > 5 && (
                    <p className="text-sm text-center text-muted-foreground">
                      And {report.needsImprovement.length - 5} more...
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-600" />
                  <p className="text-sm text-muted-foreground">
                    All images meet quality standards!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}