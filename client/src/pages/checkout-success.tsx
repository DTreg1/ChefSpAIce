import { useEffect, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Package, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { Separator } from '@/components/ui/separator';

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const paymentIntentId = params.get('payment_intent');
  const orderId = params.get('orderId');
  
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);

  // Confirm the payment with the backend
  useEffect(() => {
    if (paymentIntentId && !orderConfirmed) {
      confirmPayment();
    }
  }, [paymentIntentId]);

  const confirmPayment = async () => {
    try {
      const response = await apiRequest('/api/checkout/confirm', {
        method: 'POST',
        body: JSON.stringify({ paymentIntentId }),
      });
      
      if (response.status === 'succeeded') {
        setOrderConfirmed(true);
        setOrderData(response.order);
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
    }
  };

  // Fetch order details
  const { data: orderDetails } = useQuery({
    queryKey: [`/api/orders/${orderId}`],
    enabled: !!orderId && orderConfirmed,
  });

  const formatPrice = (priceInCents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(priceInCents / 100);
  };

  if (!orderConfirmed) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Processing your order...</p>
              <p className="text-sm text-muted-foreground text-center">
                Please wait while we confirm your payment.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-8">
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
              
              <div className="space-y-2">
                <h1 className="text-3xl font-bold">Order Confirmed!</h1>
                <CardDescription className="text-lg">
                  Thank you for your purchase
                </CardDescription>
              </div>

              {orderData && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Order ID: <span className="font-mono" data-testid="text-order-id">{orderData.id}</span></p>
                  <p>We've sent a confirmation email to <span className="font-medium">{orderData.customerEmail}</span></p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {orderDetails && orderDetails.items && (
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
              <CardDescription>
                Items in your order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orderDetails.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        Quantity: {item.quantity} × {formatPrice(item.productPrice)}
                      </p>
                    </div>
                    <span className="font-medium">
                      {formatPrice(item.subtotal)}
                    </span>
                  </div>
                ))}
                
                <Separator />
                
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Paid</span>
                  <span data-testid="text-total-paid">{formatPrice(orderDetails.amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {orderData && orderData.shippingAddress && (
          <Card>
            <CardHeader>
              <CardTitle>Shipping Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{orderData.customerName}</p>
                <p>{orderData.shippingAddress.line1}</p>
                {orderData.shippingAddress.line2 && <p>{orderData.shippingAddress.line2}</p>}
                <p>
                  {orderData.shippingAddress.city}, {orderData.shippingAddress.state} {orderData.shippingAddress.postal_code}
                </p>
                <p>{orderData.shippingAddress.country}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Package className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">Order Processing</p>
                <p className="text-sm text-muted-foreground">
                  We're preparing your order for shipment. You'll receive an email with tracking information once it's on the way.
                </p>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button 
                onClick={() => setLocation('/orders')}
                data-testid="button-view-orders"
              >
                View My Orders
              </Button>
              <Button 
                variant="outline"
                onClick={() => setLocation('/products')}
                data-testid="button-continue-shopping"
              >
                Continue Shopping
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}