"use client";

import { ArrowRightIcon } from "@phosphor-icons/react";
import { Button } from "@quicklogo/ui/components/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@quicklogo/ui/components/input-group";
import { useRef, useState, type FormEvent } from "react";

import { getAppUrl } from "@/lib/site-config";

const promptSuggestions = [
  { label: "Coffee Shop", value: "A warm neighborhood coffee shop" },
  {
    label: "Founder Tool",
    value: "A calm productivity tool for founders",
  },
];

export function HeroPrompt() {
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState("");

  function submitPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const prompt = promptRef.current?.value.trim() ?? "";
    if (!prompt) {
      setError("Describe the brand you want to create.");
      promptRef.current?.focus();
      return;
    }

    const generateUrl = new URL(getAppUrl("/generate"));
    generateUrl.searchParams.set("prompt", prompt);
    window.location.assign(generateUrl.toString());
  }

  function applySuggestion(suggestion: string) {
    if (!promptRef.current) {
      return;
    }

    promptRef.current.value = suggestion;
    setError("");
    promptRef.current.focus();
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-2">
      <form onSubmit={submitPrompt} noValidate>
        <label htmlFor="brand-prompt" className="sr-only">
          Describe the logo you want to create
        </label>
        <InputGroup className="bg-card border">
          <InputGroupTextarea
            ref={promptRef}
            id="brand-prompt"
            name="prompt"
            autoComplete="off"
            maxLength={600}
            aria-describedby={error ? "prompt-error" : "prompt-help"}
            aria-invalid={Boolean(error)}
            placeholder="Describe your business, audience, and visual direction…"
            className="min-h-24 px-4 pt-4 text-sm leading-6"
            onChange={() => {
              if (error) setError("");
            }}
          />
          <InputGroupAddon
            align="block-end"
            className="border-border justify-between border-t px-3 py-2"
          >
            <span
              id="prompt-help"
              className="text-muted-foreground hidden text-[10px] sm:block"
            >
              Add your audience, tone, and industry.
            </span>
            <InputGroupButton
              type="submit"
              variant="default"
              size="sm"
              className="ms-auto"
            >
              Generate Concepts
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>

      {error ? (
        <p
          id="prompt-error"
          aria-live="polite"
          className="text-destructive text-xs"
        >
          {error}
        </p>
      ) : null}

      <div
        className="flex flex-wrap items-center gap-2"
        aria-label="Prompt examples"
      >
        <span className="text-muted-foreground text-[10px]">Try:</span>
        {promptSuggestions.map((suggestion) => (
          <Button
            key={suggestion.label}
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => applySuggestion(suggestion.value)}
          >
            {suggestion.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
