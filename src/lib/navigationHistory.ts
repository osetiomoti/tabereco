'use client';

const STORAGE_KEY = 'tabereco_history_stack';

function getStorageStack(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

function setStorageStack(stack: string[]) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stack));
  } catch {
    // ignore
  }
}

let inMemoryStack: string[] = [];
let isPopState = false;

if (typeof window !== 'undefined') {
  inMemoryStack = getStorageStack();

  window.addEventListener('popstate', () => {
    isPopState = true;
  });
}

export function recordNavigation(path: string) {
  if (typeof window === 'undefined') return;

  if (inMemoryStack.length === 0) {
    inMemoryStack = getStorageStack();
  }

  if (isPopState) {
    isPopState = false;
    if (inMemoryStack.length > 1) {
      inMemoryStack.pop();
    } else {
      inMemoryStack = [path];
    }
  } else {
    // 新規プッシュ遷移
    if (inMemoryStack.length === 0 || inMemoryStack[inMemoryStack.length - 1] !== path) {
      inMemoryStack.push(path);
      if (inMemoryStack.length > 50) {
        inMemoryStack.shift();
      }
    }
  }

  setStorageStack(inMemoryStack);
}

export function canGoBackInApp(): boolean {
  if (typeof window === 'undefined') return false;
  if (inMemoryStack.length === 0) {
    inMemoryStack = getStorageStack();
  }
  return inMemoryStack.length > 1;
}

export function getPreviousPath(): string | null {
  if (typeof window === 'undefined') return null;
  if (inMemoryStack.length === 0) {
    inMemoryStack = getStorageStack();
  }
  if (inMemoryStack.length > 1) {
    return inMemoryStack[inMemoryStack.length - 2];
  }
  return null;
}
