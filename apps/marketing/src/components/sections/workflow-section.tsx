import { Separator } from "@quicklogo/ui/components/separator";

const steps = [
  {
    number: "01",
    title: "Describe the Business",
    description:
      "Give QuickLogo the context behind your idea, audience, and visual ambition.",
  },
  {
    number: "02",
    title: "Choose a Direction",
    description:
      "Review focused creative routes and guide the system toward the strongest fit.",
  },
  {
    number: "03",
    title: "Build the Complete Kit",
    description:
      "Refine the identity and generate the practical assets your launch needs.",
  },
];

export function WorkflowSection() {
  return (
    <section id="how-it-works" className="scroll-mt-16 border-b">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.7fr_1fr]">
          <div className="flex flex-col gap-4">
            <p className="text-primary text-xs font-medium tracking-[0.18em] uppercase">
              A Clear Process
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.045em] text-balance sm:text-5xl">
              From Brief to Brand in 3 Focused Steps.
            </h2>
            <p className="text-muted-foreground max-w-md text-sm leading-6">
              Move quickly without giving up creative control. Every step gives
              you a meaningful decision—not a wall of random options.
            </p>
          </div>

          <ol className="flex flex-col">
            {steps.map((step, index) => (
              <li key={step.number}>
                {index > 0 ? <Separator /> : null}
                <div className="grid gap-4 py-7 sm:grid-cols-[72px_1fr]">
                  <span className="text-primary text-xs font-bold">
                    {step.number}
                  </span>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-medium tracking-tight">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground max-w-xl text-sm leading-6">
                      {step.description}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
