import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CohortBuilder } from "@/components/cohorts/CohortBuilder";
import { RetentionTable } from "@/components/cohorts/RetentionTable";
import { CohortComparison } from "@/components/cohorts/CohortComparison";
import { InsightCards } from "@/components/cohorts/InsightCards";
import { CohortTimeline } from "@/components/cohorts/CohortTimeline";
import { Users, Plus, Sparkles, TrendingUp, Calendar, Filter, RefreshCw } from "lucide-react";
import type { Cohort } from "@shared/schema";

export default function CohortAnalysis() {
  const [selectedCohortIds, setSelectedCohortIds] = useState<string[]>([]);
  const [activeCohortId, setActiveCohortId] = useState<string>("");
  const [showBuilder, setShowBuilder] = useState(false);
  
  const cohortsQuery = useQuery({
    queryKey: ["/api/cohorts"],
    queryFn: async () => {
      const response = await fetch("/api/cohorts?isActive=true");
      if (!response.ok) throw new Error("Failed to fetch cohorts");
      const data = await response.json();
      return data.cohorts as Cohort[];
    },
  });
  
  const selectedCohorts = (cohortsQuery.data || []).filter(c => 
    selectedCohortIds.includes(c.id)
  );
  
  const activeCohort = (cohortsQuery.data || []).find(c => c.id === activeCohortId);
  
  const toggleCohortSelection = (cohortId: string) => {
    if (selectedCohortIds.includes(cohortId)) {
      setSelectedCohortIds(selectedCohortIds.filter(id => id !== cohortId));
    } else {
      setSelectedCohortIds([...selectedCohortIds, cohortId]);
    }
  };
  
  const selectAllCohorts = () => {
    setSelectedCohortIds((cohortsQuery.data || []).map(c => c.id));
  };
  
  const clearSelection = () => {
    setSelectedCohortIds([]);
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Cohort Analysis
          </h1>
          <p className="text-muted-foreground">
            Analyze user segments, track behavior patterns, and generate AI insights
          </p>
        </div>
        <Button 
          onClick={() => setShowBuilder(!showBuilder)}
          data-testid="button-toggle-builder"
        >
          <Plus className="h-4 w-4 mr-2" />
          {showBuilder ? "Hide Builder" : "New Cohort"}
        </Button>
      </div>
      
      {/* Cohort Builder */}
      {showBuilder && (
        <div className="mb-6">
          <CohortBuilder />
        </div>
      )}
      
      {/* Cohort Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Select Cohorts</h2>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={selectAllCohorts}
              disabled={cohortsQuery.isLoading}
              data-testid="button-select-all"
            >
              Select All
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={clearSelection}
              disabled={selectedCohortIds.length === 0}
              data-testid="button-clear-selection"
            >
              Clear
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => cohortsQuery.refetch()}
              disabled={cohortsQuery.isFetching}
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${cohortsQuery.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
        
        {cohortsQuery.isLoading ? (
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-32" />
            ))}
          </div>
        ) : cohortsQuery.error ? (
          <p className="text-sm text-destructive">
            Error loading cohorts: {(cohortsQuery.error as Error).message}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(cohortsQuery.data || []).map((cohort) => {
              const isSelected = selectedCohortIds.includes(cohort.id);
              return (
                <Badge
                  key={cohort.id}
                  variant={isSelected ? "default" : "outline"}
                  className="cursor-pointer px-3 py-1.5"
                  onClick={() => toggleCohortSelection(cohort.id)}
                  data-testid={`badge-cohort-${cohort.id}`}
                >
                  <Users className="h-3 w-3 mr-1" />
                  {cohort.name}
                  <span className="ml-2 text-xs opacity-70">
                    ({cohort.userCount || 0} users)
                  </span>
                </Badge>
              );
            })}
            {cohortsQuery.data?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No cohorts found. Create your first cohort to get started.
              </p>
            )}
          </div>
        )}
      </div>
      
      {/* Main Content */}
      {selectedCohorts.length > 0 && (
        <Tabs defaultValue="retention" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="retention" data-testid="tab-retention">
              <TrendingUp className="h-4 w-4 mr-2" />
              Retention
            </TabsTrigger>
            <TabsTrigger value="comparison" data-testid="tab-comparison">
              <Filter className="h-4 w-4 mr-2" />
              Comparison
            </TabsTrigger>
            <TabsTrigger value="insights" data-testid="tab-insights">
              <Sparkles className="h-4 w-4 mr-2" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="timeline" data-testid="tab-timeline">
              <Calendar className="h-4 w-4 mr-2" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="members" data-testid="tab-members">
              <Users className="h-4 w-4 mr-2" />
              Members
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="retention" className="space-y-4 mt-6">
            <RetentionTable cohorts={selectedCohorts} />
          </TabsContent>
          
          <TabsContent value="comparison" className="space-y-4 mt-6">
            <CohortComparison cohorts={selectedCohorts} />
          </TabsContent>
          
          <TabsContent value="insights" className="space-y-4 mt-6">
            {selectedCohorts.length === 1 ? (
              <InsightCards 
                cohortId={selectedCohorts[0].id} 
                cohortName={selectedCohorts[0].name}
              />
            ) : (
              <div className="space-y-4">
                <Select value={activeCohortId} onValueChange={setActiveCohortId}>
                  <SelectTrigger data-testid="select-cohort-insights">
                    <SelectValue placeholder="Select a cohort to view insights" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCohorts.map((cohort) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        {cohort.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {activeCohort && (
                  <InsightCards 
                    cohortId={activeCohort.id} 
                    cohortName={activeCohort.name}
                  />
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="timeline" className="space-y-4 mt-6">
            {selectedCohorts.length === 1 ? (
              <CohortTimeline 
                cohortId={selectedCohorts[0].id} 
                cohortName={selectedCohorts[0].name}
              />
            ) : (
              <div className="space-y-4">
                <Select value={activeCohortId} onValueChange={setActiveCohortId}>
                  <SelectTrigger data-testid="select-cohort-timeline">
                    <SelectValue placeholder="Select a cohort to view timeline" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCohorts.map((cohort) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        {cohort.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {activeCohort && (
                  <CohortTimeline 
                    cohortId={activeCohort.id} 
                    cohortName={activeCohort.name}
                  />
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="members" className="space-y-4 mt-6">
            <div className="space-y-4">
              <Select value={activeCohortId} onValueChange={setActiveCohortId}>
                <SelectTrigger data-testid="select-cohort-members">
                  <SelectValue placeholder="Select a cohort to view members" />
                </SelectTrigger>
                <SelectContent>
                  {selectedCohorts.map((cohort) => (
                    <SelectItem key={cohort.id} value={cohort.id}>
                      {cohort.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {activeCohort && (
                <CohortMembers 
                  cohortId={activeCohort.id} 
                  cohortName={activeCohort.name}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// Cohort Members Component
function CohortMembers({ cohortId, cohortName }: { cohortId: string; cohortName: string }) {
  const [page, setPage] = useState(0);
  const limit = 20;
  
  const membersQuery = useQuery({
    queryKey: [`/api/cohorts/${cohortId}/members`, page],
    queryFn: async () => {
      const response = await fetch(`/api/cohorts/${cohortId}/members?limit=${limit}&offset=${page * limit}`);
      if (!response.ok) throw new Error("Failed to fetch members");
      const data = await response.json();
      return data;
    },
  });
  
  if (membersQuery.isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }
  
  if (membersQuery.error) {
    return (
      <p className="text-sm text-destructive">
        Error loading members: {(membersQuery.error as Error).message}
      </p>
    );
  }
  
  const { users = [], total = 0 } = membersQuery.data || {};
  const totalPages = Math.ceil(total / limit);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">
          {cohortName} Members ({total} total)
        </h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage(page - 1)}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="flex items-center px-3 text-sm">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">User</th>
              <th className="text-left p-3 font-medium">Email</th>
              <th className="text-left p-3 font-medium">Role</th>
              <th className="text-left p-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user: any) => (
              <tr key={user.id} className="border-t">
                <td className="p-3">
                  <div className="font-medium">{user.name || "Unknown"}</div>
                  <div className="text-xs text-muted-foreground">{user.id}</div>
                </td>
                <td className="p-3 text-sm">{user.email}</td>
                <td className="p-3">
                  <Badge variant="secondary">{user.role || "user"}</Badge>
                </td>
                <td className="p-3 text-sm text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}