import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Package, ChevronRight, Filter } from "lucide-react";
import { format } from "date-fns";

// Mock data for demonstration
const mockOrders = [
  {
    id: "1",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    items: ["Milk", "Bread", "Eggs"],
    status: "delivered",
    total: 12.5,
  },
  {
    id: "2",
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    items: ["Chicken", "Vegetables", "Rice"],
    status: "delivered",
    total: 28.75,
  },
  {
    id: "3",
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    items: ["Pasta", "Tomato Sauce", "Cheese"],
    status: "delivered",
    total: 15.0,
  },
  {
    id: "4",
    date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    items: ["Fruits", "Yogurt", "Granola"],
    status: "delivered",
    total: 22.3,
  },
];

export default function Orders() {
  const [location] = useLocation();
  const [filter, setFilter] = useState<string>("all");

  // Check if we came from voice command with filter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const voiceFilter = urlParams.get("filter");
    if (voiceFilter === "recent") {
      setFilter("recent");
    }
  }, [location]);

  // Filter orders based on selected filter
  const filteredOrders =
    filter === "recent"
      ? mockOrders.filter((order) => {
          const daysDiff = Math.floor(
            (Date.now() - order.date.getTime()) / (1000 * 60 * 60 * 24),
          );
          return daysDiff <= 7;
        })
      : mockOrders;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" data-testid="title-orders">
          Order History
        </h1>
        <p className="text-muted-foreground">
          View your past food orders and purchases
        </p>
      </div>

      {/* Filter buttons */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
          data-testid="filter-all"
        >
          All Orders
        </Button>
        <Button
          variant={filter === "recent" ? "default" : "outline"}
          onClick={() => setFilter("recent")}
          data-testid="filter-recent"
        >
          <Filter className="h-4 w-4 mr-2" />
          Recent (7 days)
        </Button>
      </div>

      {/* Voice command notification */}
      {filter === "recent" && (
        <Card className="mb-6 border-primary/50 bg-primary/5">
          <CardHeader className="pb-3">
            <CardDescription className="text-primary">
              Showing recent orders from the last 7 days as requested
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Orders list */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No orders found for the selected filter
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card
              key={order.id}
              className="hover-elevate"
              data-testid={`order-${order.id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3" />
                      {format(order.date, "PPP")}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={
                      order.status === "delivered" ? "default" : "secondary"
                    }
                  >
                    {order.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Items:</p>
                    <p className="text-sm font-medium">
                      {order.items.join(", ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-lg font-semibold">
                      ${order.total.toFixed(2)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-4"
                  data-testid={`view-order-${order.id}`}
                >
                  View Details
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
