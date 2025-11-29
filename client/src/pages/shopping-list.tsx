import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import type { ShoppingItem } from "@shared/schema";

type _ShoppingListResponse = {
  items: ShoppingItem[];
  totalItems: number;
  plannedMeals: number;
  dateRange: { startDate: string; endDate: string };
  message?: string;
};

export default function ShoppingList() {
  // Default to current week
  const [startDate, setStartDate] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 0 }),
  );
  const [endDate, setEndDate] = useState<Date>(
    endOfWeek(new Date(), { weekStartsOn: 0 }),
  );
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  // Normalize dates to midnight and format
  const normalizedStartDate = useMemo(() => {
    const date = new Date(startDate);
    date.setHours(0, 0, 0, 0);
    return date.toLocaleDateString("en-CA");
  }, [startDate]);

  const normalizedEndDate = useMemo(() => {
    const date = new Date(endDate);
    date.setHours(0, 0, 0, 0);
    return date.toLocaleDateString("en-CA");
  }, [endDate]);

  const { data: shoppingListResponse, isLoading } = useQuery<ShoppingItem[] | { items: ShoppingItem[] }>({
    queryKey: [API_ENDPOINTS.shoppingList.items],
  });

  // Reset checked items when date range changes
  useEffect(() => {
    const resetItems = () => setCheckedItems(new Set());
    // Using a small timeout to avoid synchronous setState
    const timeoutId = setTimeout(resetItems, 0);
    return () => clearTimeout(timeoutId);
  }, [normalizedStartDate, normalizedEndDate]);

  const handleCheckItem = (ingredient: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(ingredient)) {
        next.delete(ingredient);
      } else {
        next.add(ingredient);
      }
      return next;
    });
  };

  const setThisWeek = () => {
    const now = new Date();
    setStartDate(startOfWeek(now, { weekStartsOn: 0 }));
    setEndDate(endOfWeek(now, { weekStartsOn: 0 }));
  };

  const setNextWeek = () => {
    const now = new Date();
    const nextWeek = addDays(now, 7);
    setStartDate(startOfWeek(nextWeek, { weekStartsOn: 0 }));
    setEndDate(endOfWeek(nextWeek, { weekStartsOn: 0 }));
  };

  // Handle both array response and object response with items property
  const items: ShoppingItem[] = Array.isArray(shoppingListResponse) 
    ? shoppingListResponse 
    : (shoppingListResponse?.items || []);
  const uncheckedCount =
    items.filter((item) => !checkedItems.has(item.name || String(item.id)))
      .length || 0;
  const checkedCount =
    items.filter((item) => checkedItems.has(item.name || String(item.id)))
      .length || 0;

  return (
    <div className="h-full overflow-y-auto bg-muted">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Shopping List
                </h1>
                <p className="text-muted-foreground">
                  {format(startDate, "MMM d")} -{" "}
                  {format(endDate, "MMM d, yyyy")}
                </p>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={setThisWeek}
                data-testid="button-this-week"
              >
                This Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={setNextWeek}
                data-testid="button-next-week"
              >
                Next Week
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="button-custom-range"
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Custom Range
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="end">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Start Date</p>
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => date && setStartDate(date)}
                        data-testid="calendar-start-date"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">End Date</p>
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => date && setEndDate(date)}
                        data-testid="calendar-end-date"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Badge variant="secondary" data-testid="badge-total-items">
              {items.length || 0} items to buy
            </Badge>
            <Badge variant="secondary" data-testid="badge-planned-meals">
              {0} planned meals
            </Badge>
            {checkedCount > 0 && (
              <Badge variant="secondary" data-testid="badge-checked">
                {checkedCount} checked
              </Badge>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading shopping list...</p>
          </div>
        ) : !items || items.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div
                className="flex flex-col items-center justify-center"
                data-testid="empty-shopping-list"
              >
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No items to buy
                </h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  Schedule some meals to generate a shopping list
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Items to Purchase</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {uncheckedCount} remaining
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {items.map((item, idx: number) => {
                  const itemId = item.name || item.id;
                  const isChecked = checkedItems.has(itemId);
                  return (
                    <div
                      key={item.id || idx}
                      className="flex items-start gap-3 p-3 rounded-md border hover-elevate transition-colors"
                      data-testid={`item-${idx}`}
                    >
                      <Checkbox
                        id={`item-${idx}`}
                        checked={isChecked || item.isPurchased}
                        onCheckedChange={() => handleCheckItem(itemId)}
                        className="mt-0.5"
                        data-testid={`checkbox-${idx}`}
                      />
                      <label
                        htmlFor={`item-${idx}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div
                          className={`font-medium ${isChecked ? "line-through text-muted-foreground" : "text-foreground"}`}
                        >
                          {item.name}
                        </div>
                        {item.quantity && (
                          <div className="text-sm text-muted-foreground mt-1">
                            Quantity: {item.quantity} {item.unit || ''}
                          </div>
                        )}
                        {item.recipeId && (
                          <div className="text-xs text-muted-foreground mt-1">
                            From recipe
                          </div>
                        )}
                      </label>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
