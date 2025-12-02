// Donation page with Stripe integration (from blueprint:javascript_stripe)
import { useState, useEffect } from "react";
import {
  useStripe,
  Elements,
  PaymentElement,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Heart, Loader2, ChevronLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

// Load Stripe with public key (conditionally to avoid crashes)
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

// Donation form component that handles payment processing
const DonationForm = ({
  donorInfo,
  setDonorInfo,
  clientSecret,
}: {
  donorInfo: {
    donorName: string;
    donorEmail: string;
    message: string;
    anonymous: boolean;
  };
  setDonorInfo: React.Dispatch<
    React.SetStateAction<{
      donorName: string;
      donorEmail: string;
      message: string;
      anonymous: boolean;
    }>
  >;
  clientSecret: string;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // First, update the donation record with donor info on the server
      // We'll extract the payment intent ID from the clientSecret
      const paymentIntentId = clientSecret.split("_secret_")[0];

      await apiRequest(
        `${API_ENDPOINTS.donations.create}/update-donor-info`,
        "POST",
        {
          paymentIntentId,
          donorName: donorInfo.donorName,
          donorEmail: donorInfo.donorEmail,
          message: donorInfo.message,
          anonymous: donorInfo.anonymous,
        },
      );

      // Now confirm the payment (donor info is already saved server-side)
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/donate/success`,
          payment_method_data: {
            billing_details: {
              name: donorInfo.anonymous
                ? "Anonymous"
                : donorInfo.donorName || "Anonymous",
              email: donorInfo.donorEmail || undefined,
            },
          },
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (err: Error | unknown) {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="donorName">Your Name (Optional)</Label>
          <Input
            id="donorName"
            type="text"
            placeholder="John Doe"
            value={donorInfo.donorName}
            onChange={(e) =>
              setDonorInfo((prev) => ({ ...prev, donorName: e.target.value }))
            }
            disabled={donorInfo.anonymous}
            data-testid="input-donor-name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="donorEmail">Email (Optional)</Label>
          <Input
            id="donorEmail"
            type="email"
            placeholder="john@example.com"
            value={donorInfo.donorEmail}
            onChange={(e) =>
              setDonorInfo((prev) => ({ ...prev, donorEmail: e.target.value }))
            }
            disabled={donorInfo.anonymous}
            data-testid="input-donor-email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Message (Optional)</Label>
          <Textarea
            id="message"
            placeholder="Leave a supportive message..."
            value={donorInfo.message}
            onChange={(e) =>
              setDonorInfo((prev) => ({ ...prev, message: e.target.value }))
            }
            disabled={donorInfo.anonymous}
            data-testid="input-donor-message"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="anonymous"
            checked={donorInfo.anonymous}
            onCheckedChange={(checked) =>
              setDonorInfo((prev) => ({
                ...prev,
                anonymous: checked as boolean,
                donorName: checked ? "" : prev.donorName,
                donorEmail: checked ? "" : prev.donorEmail,
                message: checked ? "" : prev.message,
              }))
            }
            data-testid="checkbox-anonymous"
          />
          <Label
            htmlFor="anonymous"
            className="text-sm font-medium cursor-pointer"
          >
            Make this donation anonymous
          </Label>
        </div>
      </div>

      <div className="border rounded-md p-4">
        <PaymentElement />
      </div>

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
        data-testid="button-donate-submit"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Heart className="mr-2 h-4 w-4" />
            Complete Donation
          </>
        )}
      </Button>
    </form>
  );
};

// Recent donations display component
const RecentDonations = () => {
  const { data: donations, isLoading } = useQuery<any[]>({
    queryKey: ["/api/donations/recent"],
  });

  if (isLoading || !donations || donations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Supporters</CardTitle>
        <CardDescription>Thank you to our amazing community!</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {donations.slice(0, 5).map((donation: any) => (
            <div
              key={donation.id}
              className="flex items-center justify-between py-2 border-b last:border-0"
            >
              <div>
                <p
                  className="font-medium"
                  data-testid={`text-donor-name-${donation.id}`}
                >
                  {donation.donorName}
                </p>
                {donation.message && (
                  <p
                    className="text-sm text-muted-foreground"
                    data-testid={`text-donor-message-${donation.id}`}
                  >
                    {donation.message}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p
                  className="font-semibold"
                  data-testid={`text-donation-amount-${donation.id}`}
                >
                  ${(donation.amount / 100).toFixed(2)}
                </p>
                <p
                  className="text-xs text-muted-foreground"
                  data-testid={`text-donation-date-${donation.id}`}
                >
                  {new Date(donation.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Main donation page component
export default function DonatePage() {
  const [clientSecret, setClientSecret] = useState("");
  const [selectedAmount, setSelectedAmount] = useState(1000); // $10.00 default
  const [customAmount, setCustomAmount] = useState("");
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [donorInfo, setDonorInfo] = useState({
    donorName: "",
    donorEmail: "",
    message: "",
    anonymous: false,
  });
  const { toast } = useToast();

  // Donation statistics
  const { data: stats } = useQuery<{
    totalAmount: number;
    donationCount: number;
  }>({
    queryKey: ["/api/donations/stats"],
  });

  const predefinedAmounts = [500, 1000, 2000, 5000, 10000]; // In cents

  const handleAmountSelection = async (amountInCents: number) => {
    setSelectedAmount(amountInCents);
    setCustomAmount("");
    await createPaymentIntent(amountInCents);
  };

  const handleCustomAmount = async () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount < 1) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount of at least $1.00",
        variant: "destructive",
      });
      return;
    }
    const amountInCents = Math.round(amount * 100);
    setSelectedAmount(amountInCents);
    await createPaymentIntent(amountInCents);
  };

  const createPaymentIntent = async (
    amountInCents: number,
    donorData?: {
      donorEmail?: string;
      donorName?: string;
      message?: string;
      anonymous?: boolean;
    },
  ) => {
    setIsCreatingIntent(true);
    try {
      const response = await apiRequest(
        "/api/donations/create-payment-intent",
        "POST",
        {
          amount: amountInCents,
          ...donorData,
        },
      );
      const data = response;

      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        throw new Error(data.error || "Failed to create payment intent");
      }
    } catch (error: Error | unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to initialize donation",
        variant: "destructive",
      });
    } finally {
      setIsCreatingIntent(false);
    }
  };

  // Create initial payment intent only if Stripe is configured
  useEffect(() => {
    if (stripePromise) {
      createPaymentIntent(selectedAmount);
    }
  }, []);

  // Show a friendly message if Stripe is not configured
  if (!stripePromise) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>Donations Coming Soon</CardTitle>
            <CardDescription>
              We're still setting up our donation system. Please check back
              later!
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Thank you for your interest in supporting us. We appreciate your
              patience.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Support Our Mission</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Your donation helps us continue providing tools to reduce food waste
          and make meal planning easier for everyone.
        </p>

        {stats && (
          <div className="mt-6 flex justify-center gap-8">
            <div>
              <p
                className="text-3xl font-bold text-primary"
                data-testid="text-total-raised"
              >
                ${(stats.totalAmount / 100).toFixed(0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Raised</p>
            </div>
            <div>
              <p
                className="text-3xl font-bold text-primary"
                data-testid="text-total-donors"
              >
                {stats.donationCount}
              </p>
              <p className="text-sm text-muted-foreground">Supporters</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Amount Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Amount</CardTitle>
              <CardDescription>
                Choose a donation amount or enter a custom value
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {predefinedAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant={selectedAmount === amount ? "default" : "outline"}
                    onClick={() => handleAmountSelection(amount)}
                    disabled={isCreatingIntent}
                    data-testid={`button-amount-${amount}`}
                  >
                    ${(amount / 100).toFixed(0)}
                  </Button>
                ))}
                <div className="col-span-2 md:col-span-3">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Custom amount"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      min="1"
                      step="0.01"
                      disabled={isCreatingIntent}
                      data-testid="input-custom-amount"
                    />
                    <Button
                      onClick={handleCustomAmount}
                      disabled={isCreatingIntent || !customAmount}
                      data-testid="button-set-custom-amount"
                    >
                      Set Amount
                    </Button>
                  </div>
                </div>
              </div>
              <div className="text-center text-lg font-semibold text-primary">
                Selected: ${(selectedAmount / 100).toFixed(2)}
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          {clientSecret && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Details</CardTitle>
                <CardDescription>
                  Complete your secure donation through Stripe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Elements
                  key={clientSecret}
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: "stripe",
                      variables: {
                        colorPrimary: "hsl(var(--primary))",
                      },
                    },
                  }}
                >
                  <DonationForm
                    donorInfo={donorInfo}
                    setDonorInfo={setDonorInfo}
                    clientSecret={clientSecret}
                  />
                </Elements>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <RecentDonations />

          <Card>
            <CardHeader>
              <CardTitle>Why Donate?</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <Heart className="mr-2 h-4 w-4 text-primary mt-0.5" />
                  <span>Help reduce food waste globally</span>
                </li>
                <li className="flex items-start">
                  <Heart className="mr-2 h-4 w-4 text-primary mt-0.5" />
                  <span>Support continuous improvements</span>
                </li>
                <li className="flex items-start">
                  <Heart className="mr-2 h-4 w-4 text-primary mt-0.5" />
                  <span>Keep the platform free for everyone</span>
                </li>
                <li className="flex items-start">
                  <Heart className="mr-2 h-4 w-4 text-primary mt-0.5" />
                  <span>Enable new features and integrations</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <p className="text-xs text-muted-foreground">
                All donations are processed securely through Stripe. Your
                support is greatly appreciated!
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
