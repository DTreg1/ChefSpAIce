// Donation success page (from blueprint:javascript_stripe)
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, Heart, Home, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import confetti from "canvas-confetti";

export default function DonateSuccessPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    // Get payment intent from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntent = urlParams.get("payment_intent");
    const paymentStatus = urlParams.get("payment_intent_client_secret");

    if (!paymentIntent && !paymentStatus) {
      // If no payment parameters, redirect to donation page
      setLocation("/donate");
      return;
    }

    // Confirm donation status with backend
    const confirmDonation = async () => {
      if (paymentIntent) {
        try {
          const response = await apiRequest("/api/donations/confirm", "POST", {
            paymentIntentId: paymentIntent,
          });
          const data = response;

          if (data.status !== "succeeded") {
            console.warn("Payment not yet confirmed:", data.status);
          }
        } catch (error) {
          console.error("Error confirming donation:", error);
        }
      }
    };

    confirmDonation();

    // Trigger confetti animation
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    // Set share URL
    setShareUrl(window.location.origin + "/donate");

    return () => clearInterval(interval);
  }, [setLocation]);

  const handleShare = async () => {
    const shareText =
      "I just supported an amazing cause! Join me in making a difference.";

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Support Our Mission",
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or error occurred
        // console.log('Share cancelled or failed');
      }
    } else {
      // Fallback to copying to clipboard
      const fullText = `${shareText} ${shareUrl}`;
      navigator.clipboard.writeText(fullText);
      toast({
        title: "Link Copied!",
        description: "Share link has been copied to your clipboard.",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <Card className="text-center">
        <CardHeader className="pb-8">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-3xl font-bold mb-2">
            Thank You for Your Support!
          </CardTitle>
          <CardDescription className="text-lg">
            Your donation has been successfully processed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted rounded-lg p-6">
            <Heart className="h-12 w-12 text-primary mx-auto mb-3" />
            <p className="text-muted-foreground">
              Your generosity helps us continue our mission to reduce food waste
              and make meal planning accessible to everyone. Every contribution
              makes a real difference!
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-lg mb-3">What happens next?</h3>
            <ul className="text-left space-y-2 max-w-md mx-auto">
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">
                  You'll receive an email receipt from Stripe shortly
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">
                  Your donation will be put to work immediately
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">
                  You're now part of our community of supporters
                </span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link href="/">
              <Button variant="default" size="lg" data-testid="button-home">
                <Home className="mr-2 h-4 w-4" />
                Return Home
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              onClick={handleShare}
              data-testid="button-share"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share Your Support
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Want to make an even bigger impact?{" "}
              <Link href="/donate">
                <span
                  className="text-primary hover:underline cursor-pointer"
                  data-testid="link-donate-again"
                >
                  Make another donation
                </span>
              </Link>{" "}
              or spread the word about our mission!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
