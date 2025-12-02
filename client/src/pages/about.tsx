import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChefHat,
  Heart,
  Code2,
  Database,
  Shield,
  Sparkles,
} from "lucide-react";
import { PageTransition } from "@/components/layout";
import { AnimatedCard } from "@/components/cards";

export default function About() {
  const technologies = [
    {
      category: "Frontend",
      icon: Code2,
      items: [
        {
          name: "React",
          description: "UI library for building user interfaces",
          link: "https://react.dev",
        },
        {
          name: "TypeScript",
          description: "Type-safe JavaScript superset",
          link: "https://www.typescriptlang.org",
        },
        {
          name: "Vite",
          description: "Next generation frontend build tool",
          link: "https://vitejs.dev",
        },
        {
          name: "Tailwind CSS",
          description: "Utility-first CSS framework",
          link: "https://tailwindcss.com",
        },
        {
          name: "shadcn/ui",
          description: "Beautifully designed components",
          link: "https://ui.shadcn.com",
        },
        {
          name: "Wouter",
          description: "Minimalist routing library",
          link: "https://github.com/molefrog/wouter",
        },
        {
          name: "TanStack Query",
          description: "Powerful data synchronization",
          link: "https://tanstack.com/query",
        },
        {
          name: "Framer Motion",
          description: "Animation library",
          link: "https://www.framer.com/motion",
        },
        {
          name: "Recharts",
          description: "Data visualization",
          link: "https://recharts.org",
        },
        {
          name: "Lucide React",
          description: "Beautiful icon library",
          link: "https://lucide.dev",
        },
      ],
    },
    {
      category: "Backend & Database",
      icon: Database,
      items: [
        {
          name: "Node.js",
          description: "JavaScript runtime",
          link: "https://nodejs.org",
        },
        {
          name: "Express",
          description: "Web application framework",
          link: "https://expressjs.com",
        },
        {
          name: "PostgreSQL",
          description: "Advanced relational database",
          link: "https://www.postgresql.org",
        },
        {
          name: "Drizzle ORM",
          description: "TypeScript ORM",
          link: "https://orm.drizzle.team",
        },
        {
          name: "Passport.js",
          description: "Authentication middleware",
          link: "http://www.passportjs.org",
        },
        {
          name: "OpenAI API",
          description: "AI language models",
          link: "https://openai.com",
        },
      ],
    },
    {
      category: "Services & APIs",
      icon: Sparkles,
      items: [
        {
          name: "USDA FoodData Central",
          description: "Comprehensive food database",
          link: "https://fdc.nal.usda.gov",
        },
        {
          name: "Stripe",
          description: "Payment processing",
          link: "https://stripe.com",
        },
        {
          name: "Replit Auth",
          description: "Simple authentication",
          link: "https://replit.com",
        },
        {
          name: "Google Cloud Storage",
          description: "Object storage service",
          link: "https://cloud.google.com/storage",
        },
      ],
    },
    {
      category: "Development Tools",
      icon: Shield,
      items: [
        {
          name: "Replit",
          description: "Cloud development platform",
          link: "https://replit.com",
        },
        {
          name: "ESLint",
          description: "Code linting",
          link: "https://eslint.org",
        },
        {
          name: "Prettier",
          description: "Code formatting",
          link: "https://prettier.io",
        },
        {
          name: "tsx",
          description: "TypeScript execution",
          link: "https://github.com/esbuild-kit/tsx",
        },
      ],
    },
  ];

  const acknowledgements = [
    {
      title: "Open Source Community",
      description:
        "Special thanks to all the maintainers and contributors of the open source projects that make this application possible.",
    },
    {
      title: "USDA Food Database",
      description:
        "Nutrition data is provided by the USDA FoodData Central, a trusted source for food and nutrient information.",
    },
    {
      title: "Recipe Inspiration",
      description:
        "Recipe generation powered by advanced AI models to help you create delicious meals from your available ingredients.",
    },
    {
      title: "Community Feedback",
      description:
        "Thanks to all our users who provide valuable feedback and suggestions to improve the application.",
    },
  ];

  return (
    <PageTransition className="container max-w-6xl mx-auto p-6 space-y-8">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <ChefHat className="w-10 h-10 text-primary" />
          <div>
            <h1 className="text-4xl font-bold">About ChefSpAIce</h1>
            <p className="text-muted-foreground mt-2">
              Your intelligent kitchen companion for smarter cooking and food
              management
            </p>
          </div>
        </div>
      </div>

      <AnimatedCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Our Mission
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            ChefSpAIce is designed to revolutionize how you manage your kitchen
            and cooking. We combine artificial intelligence with practical
            kitchen management to help you reduce food waste, discover new
            recipes, and make meal planning effortless.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Whether you&apos;re a beginner cook or a seasoned chef, our
            application adapts to your needs, dietary preferences, and cooking
            style. Track your inventory, get recipe suggestions based on what
            you have, and never forget what&apos;s in your fridge again.
          </p>
        </CardContent>
      </AnimatedCard>

      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Technologies & Attributions</h2>
        <div className="grid gap-6">
          {technologies.map((tech) => {
            const Icon = tech.icon;
            return (
              <AnimatedCard key={tech.category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="w-5 h-5 text-primary" />
                    {tech.category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {tech.items.map((item) => (
                      <div key={item.name} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:text-primary transition-colors"
                            data-testid={`link-tech-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            {item.name}
                          </a>
                          <Badge variant="outline" className="text-xs">
                            Open Source
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </AnimatedCard>
            );
          })}
        </div>
      </div>

      <Separator className="my-8" />

      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Acknowledgements</h2>
        <div className="grid gap-4">
          {acknowledgements.map((ack, index) => (
            <AnimatedCard key={index}>
              <CardHeader>
                <CardTitle className="text-lg">{ack.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{ack.description}</p>
              </CardContent>
            </AnimatedCard>
          ))}
        </div>
      </div>

      <Separator className="my-8" />

      <div className="text-center space-y-4 pb-8">
        <p className="text-sm text-muted-foreground">
          ChefSpAIce © 2025 | Built with{" "}
          <Heart className="w-4 h-4 inline text-red-500" /> for home cooks
          everywhere
        </p>
        <p className="text-xs text-muted-foreground">
          Version 1.0.0 | Last updated: October 2025
        </p>
      </div>
    </PageTransition>
  );
}
