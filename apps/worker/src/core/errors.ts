export class PipelineError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "PipelineError";
  }
}

export class AiProviderError extends PipelineError {
  constructor(message: string, retryable: boolean = true) {
    super(message, retryable);
    this.name = "AiProviderError";
  }
}

export class StorageError extends PipelineError {
  constructor(message: string, retryable: boolean = true) {
    super(message, retryable);
    this.name = "StorageError";
  }
}
