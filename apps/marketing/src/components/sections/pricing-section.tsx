import { ArrowRightIcon, CheckIcon } from "@phosphor-icons/react/dist/ssr";
import { PRICING_TIERS } from "@quicklogo/shared";
import { Badge } from "@quicklogo/ui/components/badge";
import { Button } from "@quicklogo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@quicklogo/ui/components/card";

import { getAppUrl } from "@/lib/site-config";

const priceFormatter = new Intl.NumberFormat("en-IN", {
  currency: "INR",
  maximumFractionDigits: 0,
  style: "currency",
});

export function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-16 border-b">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="mb-12 grid gap-5 lg:grid-cols-[1fr_0.7fr] lg:items-end">
          <div className="flex max-w-2xl flex-col gap-3">
            <p className="text-primary text-xs font-medium tracking-[0.18em] uppercase">
              Simple Credit Packs
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.045em] text-balance sm:text-5xl">
              Pay Once. Create When You Are Ready.
            </h2>
          </div>
          <p className="text-muted-foreground max-w-md text-sm leading-6 lg:justify-self-end">
            No subscription. Credits never expire and remain available for
            generations, refinements, and brand assets.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {PRICING_TIERS.map((tier) => (
            <Card
              key={tier.name}
              className={
                tier.popular
                  ? "border-primary bg-primary/5 ring-primary relative"
                  : "relative"
              }
            >
              <CardHeader className="gap-3 px-6 pt-4">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-lg font-semibold">
                    {tier.name}
                  </CardTitle>
                  {tier.popular ? <Badge>Most Popular</Badge> : null}
                </div>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-7 px-6">
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-semibold tracking-[-0.05em] tabular-nums">
                    {priceFormatter.format(tier.priceAmount)}
                  </span>
                  <span className="text-muted-foreground pb-1 text-xs">
                    one time
                  </span>
                </div>

                <div className="bg-muted border p-4">
                  <p className="text-lg font-medium tabular-nums">
                    {tier.credits} Credits
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Available until you use them.
                  </p>
                </div>

                <ul className="flex flex-col gap-3">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm"
                    >
                      <CheckIcon
                        className="text-primary size-4 shrink-0"
                        weight="bold"
                        aria-hidden="true"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="mt-3 px-6 py-5">
                <Button
                  size="lg"
                  variant={tier.popular ? "default" : "outline"}
                  className="w-full"
                  nativeButton={false}
                  render={<a href={getAppUrl("/credits")} />}
                >
                  Choose {tier.name}
                  <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
