import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const DIFFERENTIATORS = [
  {
    title: "Free",
    description: "No subscription, no tiers, no upsells.",
  },
  {
    title: "Private",
    description: "Just your closet. No feed, no followers, no browsing anyone else's.",
  },
  {
    title: "Transparent",
    description:
      "Simple, explainable matching rules — color, formality, pattern — not a mysterious algorithm guessing at your taste.",
  },
  {
    title: "Works anywhere",
    description: "A website, not an app to download.",
  },
  {
    title: "Focused",
    description:
      "Answers “what do I wear,” not a sustainability scorecard or a cost-per-wear spreadsheet.",
  },
  {
    title: "Just yours",
    description: "Nothing to shop or browse. Only the clothes you already own.",
  },
];

const STEPS = [
  {
    title: "Add your clothes",
    description:
      "Category, color, pattern, how dressy it is. A photo if you want one. Add a few things now, more later — no need to catalog your whole closet on day one.",
  },
  {
    title: "Pick an occasion",
    description: "Work, casual, date night, formal, workout, or travel.",
  },
  {
    title: "Get outfit ideas",
    description:
      "A few ranked suggestions, built only from what you added. Wear one, and it won't come back around for a couple of weeks.",
  },
];

export default function MarketingHomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <span className="font-semibold">What to Wear</span>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/login">Log in</Link>
          <Link href="/signup" className={cn(buttonVariants({ size: "sm" }))}>
            Get started
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-24 px-6 pt-8 pb-24">
        {/* Hero */}
        <section className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
          <div className="flex flex-col gap-6">
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              A full closet. Still nothing to wear?
            </h1>
            <p className="text-lg text-muted-foreground text-balance">
              Add the clothes you already own, pick an occasion, and get outfit ideas built only
              from your own closet — not a catalog to shop from.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className={cn(buttonVariants({ size: "lg" }))}>
                Get started
              </Link>
              <Link
                href="/login"
                className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
              >
                Log in
              </Link>
            </div>
          </div>
          <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-muted">
            <Image
              src="/marketing/hero-rack.jpg"
              alt="A clothing rack of neutral-toned garments against a plain wall"
              fill
              priority
              sizes="(min-width: 768px) 40vw, 90vw"
              className="object-cover"
            />
          </div>
        </section>

        {/* How it works */}
        <section className="flex flex-col gap-10">
          <div className="flex flex-col gap-2 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
            <p className="text-muted-foreground">Three steps. No shopping required.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <Card key={step.title}>
                <CardContent className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {index + 1}
                  </span>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Supporting image break */}
        <section className="relative aspect-[16/7] w-full overflow-hidden rounded-xl bg-muted">
          <Image
            src="/marketing/textured-rack.jpg"
            alt="A close-up of a clothing rack with a variety of textures and colors"
            fill
            priority
            sizes="90vw"
            className="object-cover"
          />
        </section>

        {/* Differentiators */}
        <section className="flex flex-col gap-10">
          <div className="flex flex-col gap-2 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">What this isn&apos;t</h2>
            <p className="text-muted-foreground">
              Wardrobe apps tend to pile on features. This one tries not to.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {DIFFERENTIATORS.map((item) => (
              <div key={item.title} className="flex flex-col gap-1">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Honest note */}
        <section className="mx-auto max-w-xl text-center">
          <p className="text-sm text-muted-foreground">
            Built by two people who kept staring into a full closet with nothing to wear.
            It&apos;s small, and still new — if something&apos;s rough around the edges, that&apos;s why.
          </p>
        </section>

        {/* Final CTA */}
        <section className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Add a few things. See what it comes up with.
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/signup" className={cn(buttonVariants({ size: "lg" }))}>
              Get started
            </Link>
            <Link
              href="/login"
              className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
            >
              Log in
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-6 pb-8 text-xs text-muted-foreground">
        Photos by{" "}
        <a
          href="https://unsplash.com/@thombradley"
          className="underline underline-offset-2"
          target="_blank"
          rel="noreferrer"
        >
          Thom Bradley
        </a>{" "}
        and{" "}
        <a
          href="https://unsplash.com/@alyssastrohmann"
          className="underline underline-offset-2"
          target="_blank"
          rel="noreferrer"
        >
          Alyssa Strohmann
        </a>{" "}
        on Unsplash.
      </footer>
    </div>
  );
}
