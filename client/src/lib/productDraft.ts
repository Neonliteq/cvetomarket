export type ProductDraft = {
  values?: Record<string, unknown>;
  images?: string[];
  tags?: string[];
};

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readProductDraft(storage: DraftStorage, key?: string): ProductDraft | null {
  if (!key) return null;
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) as ProductDraft : null;
  } catch {
    return null;
  }
}

export function createProductDraftController({
  key,
  storage,
  getSnapshot,
  delay = 300,
}: {
  key?: string;
  storage: DraftStorage;
  getSnapshot: () => ProductDraft;
  delay?: number;
}) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cancelScheduledWrite = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const flush = () => {
    if (!key) return;
    cancelScheduledWrite();
    storage.setItem(key, JSON.stringify(getSnapshot()));
  };

  return {
    schedule() {
      if (!key) return;
      cancelScheduledWrite();
      timer = setTimeout(flush, delay);
    },
    flush,
    clear() {
      cancelScheduledWrite();
      if (key) storage.removeItem(key);
    },
    dispose(shouldFlush: boolean) {
      if (shouldFlush) flush();
      else cancelScheduledWrite();
    },
  };
}