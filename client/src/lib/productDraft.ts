export type ProductDraft = {
  values?: Record<string, unknown>;
  images?: string[];
  tags?: string[];
  updatedAt?: string;
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

export function selectNewerProductDraft(
  localDraft: ProductDraft | null,
  serverDraft: ProductDraft | null,
): ProductDraft | null {
  if (!localDraft) return serverDraft;
  if (!serverDraft) return localDraft;
  const localTime = Date.parse(localDraft.updatedAt || "");
  const serverTime = Date.parse(serverDraft.updatedAt || "");
  return Number.isFinite(localTime) && localTime > serverTime ? localDraft : serverDraft;
}

export function createProductDraftController({
  key,
  storage,
  getSnapshot,
  onWrite,
  delay = 300,
}: {
  key?: string;
  storage: DraftStorage;
  getSnapshot: () => ProductDraft;
  onWrite?: (draft: ProductDraft) => void | Promise<void>;
  delay?: number;
}) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingWrite = Promise.resolve();

  const cancelScheduledWrite = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const flush = () => {
    if (!key) return;
    cancelScheduledWrite();
    const draft = { ...getSnapshot(), updatedAt: new Date().toISOString() };
    storage.setItem(key, JSON.stringify(draft));
    if (onWrite) {
      pendingWrite = pendingWrite.then(() => onWrite(draft)).catch(() => undefined);
    }
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
    settle() {
      cancelScheduledWrite();
      return pendingWrite;
    },
    dispose(shouldFlush: boolean) {
      if (shouldFlush) flush();
      else cancelScheduledWrite();
    },
  };
}