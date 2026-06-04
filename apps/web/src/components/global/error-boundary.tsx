import React from "react";
import { WarningCircleIcon } from "@phosphor-icons/react";
import { Button } from "@quicklogo/ui/components/button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-destructive/10 border-destructive/20 relative flex min-h-[200px] w-full flex-col items-center justify-center gap-2 rounded-xl border p-6 text-center">
          <WarningCircleIcon className="text-destructive size-8" />
          <h3 className="font-mono text-sm font-bold tracking-widest uppercase">
            Failed to Load Section
          </h3>
          <p className="text-muted-foreground max-w-[300px] text-xs">
            {this.state.error?.message ||
              "An unexpected error occurred while rendering this component."}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
