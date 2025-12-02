import { useState } from "react";
import { NaturalQueryInput } from "@/components/natural-query-input";
import { QueryResults } from "@/components/query-results";
import { QueryHistory } from "@/components/query-history";
import { SavedQueries } from "@/components/saved-queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, History, BookmarkIcon } from "lucide-react";

interface QueryData {
  queryId: string;
  sql: string;
  explanation: string[];
  confidence: number;
  queryType: string;
  tablesAccessed: string[];
}

export default function QueryBuilder() {
  const [currentQuery, setCurrentQuery] = useState<QueryData | null>(null);

  const handleQueryConverted = (result: QueryData) => {
    setCurrentQuery(result);
  };

  const handleSelectHistoryQuery = (query: any) => {
    setCurrentQuery({
      queryId: query.id,
      sql: query.generatedSql,
      explanation: [],
      confidence: query.metadata?.confidence || 0,
      queryType: "SELECT",
      tablesAccessed: [],
    });
  };

  const handleSelectSavedQuery = (query: any) => {
    setCurrentQuery({
      queryId: query.id,
      sql: query.generatedSql,
      explanation: [],
      confidence: query.metadata?.confidence || 0,
      queryType: "SELECT",
      tablesAccessed: [],
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Database className="w-8 h-8 text-primary" />
          Natural Language Query Builder
        </h1>
        <p className="text-muted-foreground">
          Ask questions in plain English and get SQL queries with results
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <NaturalQueryInput onQueryConverted={handleQueryConverted} />

          {currentQuery && (
            <QueryResults
              queryId={currentQuery.queryId}
              sql={currentQuery.sql}
              explanation={currentQuery.explanation}
              confidence={currentQuery.confidence}
              queryType={currentQuery.queryType}
              tablesAccessed={currentQuery.tablesAccessed}
            />
          )}
        </div>

        <div className="lg:col-span-1">
          <Tabs defaultValue="history" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="history" data-testid="tab-history">
                <History className="w-4 h-4 mr-2" />
                History
              </TabsTrigger>
              <TabsTrigger value="saved" data-testid="tab-saved">
                <BookmarkIcon className="w-4 h-4 mr-2" />
                Saved
              </TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="mt-4">
              <QueryHistory onSelectQuery={handleSelectHistoryQuery} />
            </TabsContent>

            <TabsContent value="saved" className="mt-4">
              <SavedQueries onSelectQuery={handleSelectSavedQuery} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
