import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, ShoppingBag, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import type { Order } from '@shared/schema';

export default function Orders() {
  const [, setLocation] = useLocation();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const formatPrice = (priceInCents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(priceInCents / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'pending':
        return 'outline';
      case 'failed':
      case 'refunded':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'Completed';
      case 'processing':
        return 'Processing';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      case 'refunded':
        return 'Refunded';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <ShoppingBag className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">No orders yet</h2>
        <p className="text-muted-foreground">Your order history will appear here</p>
        <Button 
          onClick={() => setLocation('/products')}
          data-testid="button-start-shopping"
        >
          Start Shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Orders</h1>
        <p className="text-muted-foreground">View and track your order history</p>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <Card 
            key={order.id} 
            className="hover-elevate cursor-pointer"
            onClick={() => setLocation(`/orders/${order.id}`)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium">
                    Order #{order.id.slice(0, 8)}
                  </CardTitle>
                  <CardDescription>
                    {format(new Date(order.createdAt), 'MMM d, yyyy \'at\' h:mm a')}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={getStatusColor(order.status)}
                    data-testid={`badge-order-status-${order.id}`}
                  >
                    {getStatusLabel(order.status)}
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-medium" data-testid={`text-order-total-${order.id}`}>
                      {formatPrice(order.amount)}
                    </span>
                  </div>
                  {order.customerEmail && (
                    <span className="text-muted-foreground">
                      Sent to: {order.customerEmail}
                    </span>
                  )}
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation(`/orders/${order.id}`);
                  }}
                  data-testid={`button-view-order-${order.id}`}
                >
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Button 
          variant="outline"
          onClick={() => setLocation('/products')}
          data-testid="button-continue-shopping"
        >
          Continue Shopping
        </Button>
      </div>
    </div>
  );
}