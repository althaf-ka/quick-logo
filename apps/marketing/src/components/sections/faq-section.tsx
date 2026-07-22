"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@quicklogo/ui/components/accordion";

const faqs = [
  {
    question: "What happens after I submit my idea?",
    answer:
      "You will continue in the QuickLogo studio with your description already filled in. From there, choose your generation settings, create several directions, and refine the result you like most.",
  },
  {
    question: "How do QuickLogo credits work?",
    answer:
      "Credits are used when you generate or edit logo concepts and brand assets. Credit packs are one-time purchases, and unused credits do not expire.",
  },
  {
    question: "Can I improve a logo after it is generated?",
    answer:
      "Yes. You can refine generated work instead of starting over, then carry the chosen direction into a broader brand kit.",
  },
  {
    question: "What can I create in a brand kit?",
    answer:
      "QuickLogo can extend your selected identity into logo variations, social assets, business cards, favicon assets, brand graphics, presentations, and practical guidelines.",
  },
  {
    question: "Which pack includes commercial rights?",
    answer:
      "The Pro credit pack includes full commercial rights, along with priority generations and priority support.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-16 border-b">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[0.7fr_1fr] lg:px-8 lg:py-28">
        <div className="flex max-w-md flex-col gap-4">
          <p className="text-primary text-xs font-medium tracking-[0.18em] uppercase">
            Frequently Asked Questions
          </p>
          <h2 className="text-3xl font-semibold tracking-[-0.045em] text-balance sm:text-5xl">
            A Few Details Before You Begin.
          </h2>
          <p className="text-muted-foreground text-sm leading-6">
            QuickLogo keeps the process simple: bring the idea, choose the
            direction, and spend credits only when you create.
          </p>
        </div>

        <Accordion defaultValue={["What happens after I submit my idea?"]}>
          {faqs.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question}>
              <AccordionTrigger className="py-5 text-left text-sm font-medium no-underline hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground max-w-2xl pb-5 text-sm leading-6">
                <p>{faq.answer}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
