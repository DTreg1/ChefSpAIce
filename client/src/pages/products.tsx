import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingCart, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@shared/schema';

export default function Products() {
  const { toast } = useToast();
  const [loadingProducts, setLoadingProducts] = useState<Set<string>>(new Set());

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const addToCartMutation = useMutation({
    mutationFn: (data: { productId: string; quantity: number }) =>
      apiRequest('/api/cart', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({
        title: 'Added to cart!',
        description: 'The item has been added to your shopping cart.',
      });
      setLoadingProducts(prev => {
        const next = new Set(prev);
        next.delete(variables.productId);
        return next;
      });
    },
    onError: (error: any, variables) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add item to cart',
        variant: 'destructive',
      });
      setLoadingProducts(prev => {
        const next = new Set(prev);
        next.delete(variables.productId);
        return next;
      });
    },
  });

  const handleAddToCart = (productId: string) => {
    setLoadingProducts(prev => new Set(prev).add(productId));
    addToCartMutation.mutate({ productId, quantity: 1 });
  };

  const formatPrice = (priceInCents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(priceInCents / 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Package className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">No products available</h2>
        <p className="text-muted-foreground">Check back later for new items!</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Shop Products</h1>
        <p className="text-muted-foreground">Browse our selection of quality products</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <Card key={product.id} className="hover-elevate">
            {product.imageUrl && (
              <div className="relative h-48 overflow-hidden rounded-t-lg">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  data-testid={`img-product-${product.id}`}
                />
                {product.stock === 0 && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <Badge variant="secondary" className="text-lg">Out of Stock</Badge>
                  </div>
                )}
              </div>
            )}
            
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="line-clamp-2" data-testid={`text-product-name-${product.id}`}>
                  {product.name}
                </CardTitle>
                <Badge variant="secondary" className="shrink-0">
                  <span data-testid={`text-product-price-${product.id}`}>
                    {formatPrice(product.price)}
                  </span>
                </Badge>
              </div>
              {product.category && (
                <Badge variant="outline" className="mt-2" data-testid={`text-product-category-${product.id}`}>
                  {product.category}
                </Badge>
              )}
            </CardHeader>

            {product.description && (
              <CardContent>
                <CardDescription className="line-clamp-3" data-testid={`text-product-description-${product.id}`}>
                  {product.description}
                </CardDescription>
              </CardContent>
            )}

            <CardFooter className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground" data-testid={`text-product-stock-${product.id}`}>
                {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
              </span>
              <Button
                onClick={() => handleAddToCart(product.id)}
                disabled={product.stock === 0 || loadingProducts.has(product.id)}
                size="sm"
                data-testid={`button-add-to-cart-${product.id}`}
              >
                {loadingProducts.has(product.id) ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ShoppingCart className="w-4 h-4 mr-2" />
                )}
                Add to Cart
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}