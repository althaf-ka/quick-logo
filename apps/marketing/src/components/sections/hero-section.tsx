import { HeroPrompt } from "@/components/hero-prompt";

export function HeroSection() {
  return (
    <section className="border-b">
      <div className="mx-auto flex max-w-6xl flex-col items-center px-5 py-16 text-center sm:py-20 lg:px-8 lg:py-24">
        <p className="text-primary mb-4 text-[10px] font-medium tracking-[0.18em] uppercase">
          AI Brand Identity Studio
        </p>
        <h1 className="max-w-3xl text-4xl leading-[1.06] font-semibold tracking-[-0.05em] text-balance sm:text-5xl lg:text-6xl">
          A Distinctive Brand Starts With One Clear Idea.
        </h1>
        <p className="text-muted-foreground mt-4 max-w-xl text-sm leading-6 text-pretty">
          Describe your business, explore focused logo directions, and turn the
          strongest concept into a complete identity.
        </p>

        <div className="mt-8 w-full max-w-2xl text-left">
          <HeroPrompt />
        </div>
      </div>
    </section>
  );
}
