export function isAllowedRedirect(
  targetUrl: string,
  allowedOrigins: string[],
): boolean {
  try {
    const parsedTarget = new URL(targetUrl);

    return allowedOrigins.some((origin) => {
      try {
        const parsedAllowed = new URL(origin);
        return (
          parsedTarget.hostname === parsedAllowed.hostname ||
          parsedTarget.hostname.endsWith(`.${parsedAllowed.hostname}`)
        );
      } catch {
        return (
          parsedTarget.hostname === origin ||
          parsedTarget.hostname.endsWith(`.${origin}`)
        );
      }
    });
  } catch {
    return false;
  }
}
