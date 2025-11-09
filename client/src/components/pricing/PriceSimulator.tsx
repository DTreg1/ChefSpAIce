/**
 * Price Simulator Component
 * 
 * What-if analysis tool for testing different pricing scenarios.
 * Allows simulation of various market conditions.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Calculator, TrendingUp, AlertTriangle, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface SimulationScenario {
  price: number;
  demandLevel?: number;
  inventoryLevel?: number;
  competitorPrice?: number;
}

interface SimulationResult {
  price: number;
  predictedDemand: string;
  estimatedUnits: number;
  estimatedRevenue: string;
  revenueChange: string;
  profitMargin: string;
}

interface PriceSimulatorProps {
  productId: string;
  productName: string;
  basePrice: number;
  minPrice: number;
  maxPrice: number;
}

export function PriceSimulator({
  productId,
  productName,
  basePrice,
  minPrice,
  maxPrice
}: PriceSimulatorProps) {
  const [scenarios, setScenarios] = useState<SimulationScenario[]>([
    { price: basePrice * 0.9, demandLevel: 50, inventoryLevel: 50 },
    { price: basePrice, demandLevel: 50, inventoryLevel: 50 },
    { price: basePrice * 1.1, demandLevel: 50, inventoryLevel: 50 }
  ]);
  const [results, setResults] = useState<SimulationResult[] | null>(null);
  const [selectedScenario, setSelectedScenario] = useState(0);

  // Simulation mutation
  const simulationMutation = useMutation({
    mutationFn: async (data: { productId: string; scenarios: SimulationScenario[] }) => {
      return apiRequest('/api/pricing/simulate', 'POST', data);
    },
    onSuccess: (data: any) => {
      setResults(data.scenarios);
    }
  });

  // Update scenario
  const updateScenario = (index: number, field: keyof SimulationScenario, value: number) => {
    const newScenarios = [...scenarios];
    newScenarios[index] = { ...newScenarios[index], [field]: value };
    setScenarios(newScenarios);
  };

  // Add scenario
  const addScenario = () => {
    if (scenarios.length < 5) {
      setScenarios([...scenarios, { 
        price: basePrice, 
        demandLevel: 50, 
        inventoryLevel: 50 
      }]);
    }
  };

  // Remove scenario
  const removeScenario = (index: number) => {
    if (scenarios.length > 1) {
      setScenarios(scenarios.filter((_, i) => i !== index));
      if (selectedScenario >= scenarios.length - 1) {
        setSelectedScenario(Math.max(0, selectedScenario - 1));
      }
    }
  };

  // Run simulation
  const runSimulation = () => {
    simulationMutation.mutate({ productId, scenarios });
  };

  // Prepare radar chart data
  const radarData = results ? results.map((result, idx) => ({
    metric: `Scenario ${idx + 1}`,
    demand: parseFloat(result.predictedDemand),
    revenue: parseFloat(result.estimatedRevenue) / 100,
    margin: parseFloat(result.profitMargin),
    units: result.estimatedUnits / 10
  })) : [];

  return (
    <div className="space-y-6" data-testid="price-simulator">
      <Card>
        <CardHeader>
          <CardTitle>Price Simulator</CardTitle>
          <CardDescription>
            Test different pricing scenarios for {productName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="scenarios" className="space-y-4">
            <TabsList>
              <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
              <TabsTrigger value="results" disabled={!results}>Results</TabsTrigger>
              <TabsTrigger value="comparison" disabled={!results}>Comparison</TabsTrigger>
            </TabsList>

            {/* Scenarios Tab */}
            <TabsContent value="scenarios" className="space-y-4">
              {scenarios.map((scenario, idx) => (
                <Card key={idx} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Scenario {idx + 1}</h4>
                      {scenarios.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeScenario(idx)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>

                    {/* Price Input */}
                    <div className="space-y-2">
                      <Label>Price: ${scenario.price.toFixed(2)}</Label>
                      <Slider
                        value={[scenario.price]}
                        onValueChange={([value]) => updateScenario(idx, 'price', value)}
                        min={minPrice}
                        max={maxPrice}
                        step={0.01}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>${minPrice.toFixed(2)}</span>
                        <span>${basePrice.toFixed(2)} (base)</span>
                        <span>${maxPrice.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Demand Level */}
                    <div className="space-y-2">
                      <Label>Expected Demand: {scenario.demandLevel}%</Label>
                      <Slider
                        value={[scenario.demandLevel || 50]}
                        onValueChange={([value]) => updateScenario(idx, 'demandLevel', value)}
                        min={0}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>

                    {/* Inventory Level */}
                    <div className="space-y-2">
                      <Label>Inventory Level: {scenario.inventoryLevel}%</Label>
                      <Slider
                        value={[scenario.inventoryLevel || 50]}
                        onValueChange={([value]) => updateScenario(idx, 'inventoryLevel', value)}
                        min={0}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>

                    {/* Competitor Price */}
                    <div className="space-y-2">
                      <Label>Competitor Price (optional)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={scenario.competitorPrice || ''}
                        onChange={(e) => updateScenario(idx, 'competitorPrice', parseFloat(e.target.value) || 0)}
                        placeholder={`Default: $${basePrice.toFixed(2)}`}
                      />
                    </div>
                  </div>
                </Card>
              ))}

              {scenarios.length < 5 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={addScenario}
                >
                  Add Scenario
                </Button>
              )}

              <Button
                className="w-full"
                onClick={runSimulation}
                disabled={simulationMutation.isPending}
                data-testid="run-simulation-button"
              >
                {simulationMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Simulation...
                  </>
                ) : (
                  <>
                    <Calculator className="mr-2 h-4 w-4" />
                    Run Simulation
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Results Tab */}
            <TabsContent value="results" className="space-y-4">
              {results && (
                <>
                  {results.map((result, idx) => (
                    <Card key={idx} className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">
                            Scenario {idx + 1}: ${result.price.toFixed(2)}
                          </h4>
                          <Badge
                            variant={parseFloat(result.revenueChange) > 0 ? "default" : "destructive"}
                          >
                            {result.revenueChange} revenue
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Predicted Demand</p>
                            <p className="text-lg font-medium">{result.predictedDemand}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Estimated Units</p>
                            <p className="text-lg font-medium">{result.estimatedUnits}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Estimated Revenue</p>
                            <p className="text-lg font-medium">${result.estimatedRevenue}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Profit Margin</p>
                            <p className="text-lg font-medium">{result.profitMargin}</p>
                          </div>
                        </div>

                        {parseFloat(result.revenueChange) > 10 && (
                          <Alert>
                            <TrendingUp className="h-4 w-4" />
                            <AlertDescription>
                              This scenario shows strong revenue potential
                            </AlertDescription>
                          </Alert>
                        )}
                        {parseFloat(result.revenueChange) < -10 && (
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              This scenario may significantly reduce revenue
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </Card>
                  ))}
                </>
              )}
            </TabsContent>

            {/* Comparison Tab */}
            <TabsContent value="comparison" className="space-y-4">
              {results && (
                <>
                  {/* Bar Chart Comparison */}
                  <Card className="p-4">
                    <h4 className="font-medium mb-4">Revenue Comparison</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={results.map((r, idx) => ({
                        scenario: `S${idx + 1}`,
                        revenue: parseFloat(r.estimatedRevenue),
                        units: r.estimatedUnits,
                        margin: parseFloat(r.profitMargin)
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="scenario" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="revenue" fill="hsl(var(--chart-1))" name="Revenue ($)" />
                        <Bar dataKey="units" fill="hsl(var(--chart-2))" name="Units" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>

                  {/* Radar Chart Comparison */}
                  <Card className="p-4">
                    <h4 className="font-medium mb-4">Multi-Factor Analysis</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" />
                        <PolarRadiusAxis />
                        <Radar
                          name="Metrics"
                          dataKey="demand"
                          stroke="hsl(var(--chart-1))"
                          fill="hsl(var(--chart-1))"
                          fillOpacity={0.3}
                        />
                        <Radar
                          name="Revenue"
                          dataKey="revenue"
                          stroke="hsl(var(--chart-2))"
                          fill="hsl(var(--chart-2))"
                          fillOpacity={0.3}
                        />
                        <Radar
                          name="Margin"
                          dataKey="margin"
                          stroke="hsl(var(--chart-3))"
                          fill="hsl(var(--chart-3))"
                          fillOpacity={0.3}
                        />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {simulationMutation.isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to run simulation. Please try again.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}