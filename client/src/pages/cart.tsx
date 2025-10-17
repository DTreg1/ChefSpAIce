import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { CartItem } from '@shared/schema';

export default function Cart() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  const { data: cartItems = [], isLoading } = useQuery<(CartItem & { product: any })[]>({
    queryKey: ['/api/cart'],
  });

  const updateQuantityMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      apiRequest(`/api/cart/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(variables.productId);
        return next;
      });
    },
    onError: (error: any, variables) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update quantity',
        variant: 'destructive',
      });
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(variables.productId);
        return next;
      });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (productId: string) =>
      apiRequest(`/api/cart/${productId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, productId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({
        title: 'Removed from cart',
        description: 'The item has been removed from your cart.',
      });
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    },
    onError: (error: any, productId) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove item',
        variant: 'destructive',
      });
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    },
  });

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setUpdatingItems(prev => new Set(prev).add(productId));
    updateQuantityMutation.mutate({ productId, quantity: newQuantity });
  };

  const handleRemove = (productId: string) => {
    setUpdatingItems(prev => new Set(prev).add(productId));
    removeItemMutation.mutate(productId);
  };

  const formatPrice = (priceInCents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(priceInCents / 100);
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <ShoppingCart className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Your cart is empty</h2>
        <p className="text-muted-foreground">Add some products to get started!</p>
        <Button 
          onClick={() => setLocation('/products')}
          data-testid="button-browse-products"
        >
          Browse Products
        </Button>
      </div>
    );
  }

  const totalAmount = calculateTotal();

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Shopping Cart</h1>
        <p className="text-muted-foreground">Review and manage your items</p>
      </div>

      <div className="space-y-4">
        {cartItems.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex gap-6">
                {item.product.imageUrl && (
                  <div className="w-24 h-24 shrink-0 rounded-md overflow-hidden">
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                      data-testid={`img-cart-product-${item.productId}`}
                    />
                  </div>
                )}
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg" data-testid={`text-cart-product-name-${item.productId}`}>
                        {item.product.name}
                      </h3>
                      {item.product.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.product.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" data-testid={`text-cart-product-price-${item.productId}`}>
                      {formatPrice(item.product.price)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                        disabled={item.quantity <= 1 || updatingItems.has(item.productId)}
                        data-testid={`button-decrease-quantity-${item.productId}`}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value) && value > 0) {
                            handleQuantityChange(item.productId, value);
                          }
                        }}
                        className="w-20 text-center"
                        disabled={updatingItems.has(item.productId)}
                        min={1}
                        data-testid={`input-quantity-${item.productId}`}
                      />
                      
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock || updatingItems.has(item.productId)}
                        data-testid={`button-increase-quantity-${item.productId}`}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>

                      <span className="text-sm text-muted-foreground ml-2">
                        {item.product.stock} available
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-semibold" data-testid={`text-cart-subtotal-${item.productId}`}>
                        {formatPrice(item.product.price * item.quantity)}
                      </span>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(item.productId)}
                        disabled={updatingItems.has(item.productId)}
                        data-testid={`button-remove-item-${item.productId}`}
                      >
                        {updatingItems.has(item.productId) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span data-testid="text-subtotal">{formatPrice(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Tax</span>
              <span>Calculated at checkout</span>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span data-testid="text-total">{formatPrice(totalAmount)}</span>
          </div>

          <Button 
            className="w-full" 
            size="lg"
            onClick={() => setLocation('/checkout')}
            disabled={cartItems.length === 0}
            data-testid="button-proceed-to-checkout"
          >
            Proceed to Checkout
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setLocation('/products')}
            data-testid="button-continue-shopping"
          >
            Continue Shopping
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}