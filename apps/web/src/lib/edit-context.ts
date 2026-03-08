const STORAGE_KEY = "quicklogo:edit-context";

export interface EditContext {
  imageUrl: string;
  prompt: string;
}

/** Save edit context before navigating to /edit */
export function saveEditContext(ctx: EditContext) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
}

/** Read and validate the edit context */
export function getEditContext(): EditContext | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EditContext;
    return parsed.imageUrl ? parsed : null;
  } catch {
    return null;
  }
}
