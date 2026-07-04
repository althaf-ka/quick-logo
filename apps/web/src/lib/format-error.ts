export function formatGenerationError(errorMsg?: string | null): string {
  if (!errorMsg) return "An unexpected error occurred.";

  let msg = errorMsg;

  // Extract JSON if it's a JSON string or contains JSON
  const extractJsonMsg = (str: string) => {
    try {
      const parsed = JSON.parse(str);
      return parsed.error || parsed.detail || parsed.message || null;
    } catch {
      return null;
    }
  };

  const parsed = extractJsonMsg(msg);
  if (parsed) {
    msg = parsed;
  } else {
    const jsonMatch = msg.match(/\{.*\}/);
    if (jsonMatch) {
      const inner = extractJsonMsg(jsonMatch[0]);
      if (inner) msg = inner;
    }
  }

  // Strip error codes like "3030: " or "3030: Model input is not valid: "
  msg = msg.replace(/^\d{3,4}:\s*(.*?:\s*)?/, "");

  // Strip URLs and expose generic "provider"
  msg = msg.replace(/https?:\/\/[^\s]+/g, "the provider");

  // Friendly overrides
  const lowerMsg = msg.toLowerCase();
  if (
    lowerMsg.includes("insufficient balance") ||
    lowerMsg.includes("not enough credits")
  ) {
    return "Not enough credits to generate this image.";
  }

  let formatted = msg;
  if (lowerMsg.includes("timeout") || lowerMsg.includes("timed out")) {
    formatted = "The generation took too long and timed out. Please try again.";
  } else if (
    lowerMsg.includes("unprocessable entity") ||
    lowerMsg.includes("invalid input") ||
    lowerMsg.includes("missing required input image")
  ) {
    formatted = "Invalid configuration or missing image for this model.";
  } else if (lowerMsg.includes("nsfw") || lowerMsg.includes("safety check")) {
    formatted =
      "The prompt triggered safety filters. Please modify your prompt.";
  } else {
    // Clean up any remaining backend artifacts
    if (formatted.includes("failed with status")) {
      formatted = "The AI provider encountered a temporary error.";
    }

    // Capitalize first letter
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);

    // Cap length just in case
    if (formatted.length > 120) {
      formatted = formatted.substring(0, 120) + "...";
    }
  }

  if (!formatted.endsWith(".")) formatted += ".";

  const isInsufficient =
    lowerMsg.includes("insufficient balance") ||
    lowerMsg.includes("not enough credits");

  if (!isInsufficient && !formatted.toLowerCase().includes("refund")) {
    formatted += " Credits were automatically refunded.";
  }

  return formatted;
}
