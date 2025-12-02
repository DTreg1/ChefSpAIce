/**
 * Form Completion Demo Page
 *
 * Demonstrates the smart form auto-completion feature with ML-powered
 * suggestions and context-aware predictions.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  SmartFormField,
  FormMemoryToggle,
  AutoFillAllButton,
  AutoCompleteInput,
} from "@/components/forms";
import { Input } from "@/components/ui/input";
import {
  Brain,
  Sparkles,
  Mail,
  Phone,
  MapPin,
  Building,
  User,
  Globe,
} from "lucide-react";

// Form schema for user profile
const userProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
});

type UserProfileData = z.infer<typeof userProfileSchema>;

// Form schema for shipping address
const shippingSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  streetAddress: z.string().min(1, "Street address is required"),
  apartment: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(5, "ZIP code must be at least 5 digits"),
  country: z.string().min(1, "Country is required"),
  phoneNumber: z.string().optional(),
});

type ShippingData = z.infer<typeof shippingSchema>;

export default function FormCompletionDemo() {
  const [formMemoryEnabled, setFormMemoryEnabled] = useState(true);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [activeForm, setActiveForm] = useState<"profile" | "shipping">(
    "profile",
  );

  // User Profile Form
  const profileForm = useForm<UserProfileData>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      company: "",
      jobTitle: "",
    },
  });

  // Shipping Address Form
  const shippingForm = useForm<ShippingData>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      fullName: "",
      streetAddress: "",
      apartment: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      phoneNumber: "",
    },
  });

  const onProfileSubmit = (data: UserProfileData) => {
    setSubmittedData(data);
    toast({
      title: "Profile saved!",
      description: "Your profile has been updated successfully.",
    });
  };

  const onShippingSubmit = (data: ShippingData) => {
    setSubmittedData(data);
    toast({
      title: "Address saved!",
      description: "Your shipping address has been saved.",
    });
  };

  const handleAutoFillProfile = async () => {
    // In a real app, this would fetch the most common values
    profileForm.setValue("country", "United States");
    profileForm.setValue("state", "CA");
    toast({
      title: "Auto-filled",
      description: "Common fields have been filled with your usual values.",
    });
  };

  const handleAutoFillShipping = async () => {
    // In a real app, this would fetch from user's saved addresses
    shippingForm.setValue("country", "United States");
    toast({
      title: "Auto-filled",
      description:
        "Fields have been filled with your default shipping address.",
    });
  };

  // Get form context for contextual suggestions
  const profileContext = profileForm.watch();
  const shippingContext = shippingForm.watch();

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold">
          Smart Form Auto-Completion Demo
        </h1>
        <p className="text-muted-foreground">
          Experience ML-powered form suggestions that learn from your patterns
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Badge variant="secondary">
            <Brain className="mr-1 h-3 w-3" />
            TensorFlow.js
          </Badge>
          <Badge variant="secondary">
            <Sparkles className="mr-1 h-3 w-3" />
            OpenAI Enhanced
          </Badge>
          <Badge variant="secondary">
            <Globe className="mr-1 h-3 w-3" />
            Context-Aware
          </Badge>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Settings</CardTitle>
            <FormMemoryToggle
              enabled={formMemoryEnabled}
              onChange={setFormMemoryEnabled}
            />
          </div>
          <CardDescription>
            Control how forms remember and suggest your information
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="mb-4 flex gap-2">
        <Button
          variant={activeForm === "profile" ? "default" : "outline"}
          onClick={() => setActiveForm("profile")}
          data-testid="button-profile-form"
        >
          <User className="mr-2 h-4 w-4" />
          User Profile
        </Button>
        <Button
          variant={activeForm === "shipping" ? "default" : "outline"}
          onClick={() => setActiveForm("shipping")}
          data-testid="button-shipping-form"
        >
          <MapPin className="mr-2 h-4 w-4" />
          Shipping Address
        </Button>
      </div>

      {activeForm === "profile" ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>User Profile Form</CardTitle>
                <CardDescription>
                  Try typing your email, city, or country to see smart
                  suggestions
                </CardDescription>
              </div>
              <AutoFillAllButton onClick={handleAutoFillProfile} />
            </div>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form
                onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                className="space-y-4"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <SmartFormField
                    control={profileForm.control}
                    name="firstName"
                    label="First Name"
                    placeholder="John"
                    required
                    enableAutoComplete={formMemoryEnabled}
                    context={profileContext}
                    autoFocus
                  />

                  <SmartFormField
                    control={profileForm.control}
                    name="lastName"
                    label="Last Name"
                    placeholder="Doe"
                    required
                    enableAutoComplete={formMemoryEnabled}
                    context={profileContext}
                  />
                </div>

                <SmartFormField
                  control={profileForm.control}
                  name="email"
                  label="Email"
                  placeholder="john.doe@example.com"
                  type="email"
                  required
                  enableAutoComplete={formMemoryEnabled}
                  context={profileContext}
                  showPrivacyToggle
                />

                <SmartFormField
                  control={profileForm.control}
                  name="phone"
                  label="Phone"
                  placeholder="+1 (555) 123-4567"
                  type="tel"
                  enableAutoComplete={formMemoryEnabled}
                  context={profileContext}
                />

                <Separator />

                <SmartFormField
                  control={profileForm.control}
                  name="address"
                  label="Street Address"
                  placeholder="123 Main St"
                  enableAutoComplete={formMemoryEnabled}
                  context={profileContext}
                />

                <div className="grid gap-4 md:grid-cols-3">
                  <SmartFormField
                    control={profileForm.control}
                    name="city"
                    label="City"
                    placeholder="San Francisco"
                    enableAutoComplete={formMemoryEnabled}
                    context={profileContext}
                    showHistoryButton
                  />

                  <SmartFormField
                    control={profileForm.control}
                    name="state"
                    label="State/Province"
                    placeholder="CA"
                    enableAutoComplete={formMemoryEnabled}
                    context={profileContext}
                  />

                  <SmartFormField
                    control={profileForm.control}
                    name="zipCode"
                    label="ZIP Code"
                    placeholder="94102"
                    enableAutoComplete={formMemoryEnabled}
                    context={profileContext}
                  />
                </div>

                <SmartFormField
                  control={profileForm.control}
                  name="country"
                  label="Country"
                  placeholder="United States"
                  enableAutoComplete={formMemoryEnabled}
                  context={profileContext}
                />

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <SmartFormField
                    control={profileForm.control}
                    name="company"
                    label="Company"
                    placeholder="Acme Inc."
                    enableAutoComplete={formMemoryEnabled}
                    context={profileContext}
                  />

                  <SmartFormField
                    control={profileForm.control}
                    name="jobTitle"
                    label="Job Title"
                    placeholder="Software Engineer"
                    enableAutoComplete={formMemoryEnabled}
                    context={profileContext}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => profileForm.reset()}
                  >
                    Clear
                  </Button>
                  <Button type="submit">Save Profile</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Shipping Address Form</CardTitle>
                <CardDescription>
                  Context-aware suggestions based on your location
                </CardDescription>
              </div>
              <AutoFillAllButton onClick={handleAutoFillShipping} />
            </div>
          </CardHeader>
          <CardContent>
            <Form {...shippingForm}>
              <form
                onSubmit={shippingForm.handleSubmit(onShippingSubmit)}
                className="space-y-4"
              >
                <SmartFormField
                  control={shippingForm.control}
                  name="fullName"
                  label="Full Name"
                  placeholder="John Doe"
                  required
                  enableAutoComplete={formMemoryEnabled}
                  context={shippingContext}
                  autoFocus
                />

                <SmartFormField
                  control={shippingForm.control}
                  name="streetAddress"
                  label="Street Address"
                  placeholder="123 Main St"
                  required
                  enableAutoComplete={formMemoryEnabled}
                  context={shippingContext}
                />

                <SmartFormField
                  control={shippingForm.control}
                  name="apartment"
                  label="Apartment, Suite, etc."
                  placeholder="Apt 4B"
                  enableAutoComplete={formMemoryEnabled}
                  context={shippingContext}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <SmartFormField
                    control={shippingForm.control}
                    name="city"
                    label="City"
                    placeholder="San Francisco"
                    required
                    enableAutoComplete={formMemoryEnabled}
                    context={shippingContext}
                  />

                  <SmartFormField
                    control={shippingForm.control}
                    name="state"
                    label="State"
                    placeholder="CA"
                    required
                    enableAutoComplete={formMemoryEnabled}
                    context={shippingContext}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <SmartFormField
                    control={shippingForm.control}
                    name="zipCode"
                    label="ZIP Code"
                    placeholder="94102"
                    required
                    enableAutoComplete={formMemoryEnabled}
                    context={shippingContext}
                  />

                  <SmartFormField
                    control={shippingForm.control}
                    name="country"
                    label="Country"
                    placeholder="United States"
                    required
                    enableAutoComplete={formMemoryEnabled}
                    context={shippingContext}
                  />
                </div>

                <SmartFormField
                  control={shippingForm.control}
                  name="phoneNumber"
                  label="Phone Number"
                  placeholder="+1 (555) 123-4567"
                  type="tel"
                  enableAutoComplete={formMemoryEnabled}
                  context={shippingContext}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => shippingForm.reset()}
                  >
                    Clear
                  </Button>
                  <Button type="submit">Save Address</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {submittedData && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Submitted Data</CardTitle>
            <CardDescription>
              This data would be saved and used to improve future suggestions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="rounded-lg bg-muted p-4 text-sm">
              {JSON.stringify(submittedData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
