import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createProductDraftController,
  readProductDraft,
  selectNewerProductDraft,
  type ProductDraft,
} from "./productDraft";

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("product draft persistence", () => {
  it("flushes text when leaving before the autosave delay finishes", () => {
    vi.useFakeTimers();
    const storage = createStorage();
    let snapshot: ProductDraft = { values: { name: "" } };
    const draft = createProductDraftController({
      key: "product:new",
      storage,
      getSnapshot: () => snapshot,
    });

    snapshot = { values: { name: "Букет пионов" } };
    draft.schedule();
    draft.dispose(true);

    expect(readProductDraft(storage, "product:new")?.values?.name).toBe("Букет пионов");
  });

  it("saves both a completed photo upload and a concurrent tag change", () => {
    vi.useFakeTimers();
    const storage = createStorage();
    const snapshot: ProductDraft = { values: {}, images: [], tags: [] };
    const draft = createProductDraftController({
      key: "product:new",
      storage,
      getSnapshot: () => snapshot,
    });

    snapshot.tags = ["пионы"];
    draft.schedule();
    snapshot.images = ["/uploads/peonies.jpg"];
    draft.schedule();
    vi.runAllTimers();

    expect(readProductDraft(storage, "product:new")).toMatchObject({
      images: ["/uploads/peonies.jpg"],
      tags: ["пионы"],
    });
  });

  it("flushes the first product before switching directly to a second product", () => {
    vi.useFakeTimers();
    const storage = createStorage();
    const firstSnapshot: ProductDraft = { values: { name: "Первый товар — изменён" } };
    const firstDraft = createProductDraftController({
      key: "product:first",
      storage,
      getSnapshot: () => firstSnapshot,
    });

    firstDraft.schedule();
    firstDraft.dispose(true);

    const secondDraft = createProductDraftController({
      key: "product:second",
      storage,
      getSnapshot: () => ({ values: { name: "Второй товар — изменён" } }),
    });
    secondDraft.schedule();
    secondDraft.dispose(true);

    expect(readProductDraft(storage, "product:first")?.values?.name).toBe("Первый товар — изменён");
    expect(readProductDraft(storage, "product:second")?.values?.name).toBe("Второй товар — изменён");
  });

  it("clears the draft after a successful create", () => {
    vi.useFakeTimers();
    const storage = createStorage();
    const draft = createProductDraftController({
      key: "product:new",
      storage,
      getSnapshot: () => ({ values: { name: "Новый товар" } }),
    });

    draft.schedule();
    draft.flush();
    draft.clear();
    vi.runAllTimers();

    expect(readProductDraft(storage, "product:new")).toBeNull();
  });

  it("timestamps the same snapshot sent to local and server storage", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T12:00:00.000Z"));
    const storage = createStorage();
    const onWrite = vi.fn();
    const draft = createProductDraftController({
      key: "product:new",
      storage,
      getSnapshot: () => ({ values: { name: "Между устройствами" } }),
      onWrite,
    });

    draft.flush();
    await draft.settle();

    expect(readProductDraft(storage, "product:new")?.updatedAt).toBe("2026-09-05T12:00:00.000Z");
    expect(onWrite).toHaveBeenCalledWith(expect.objectContaining({
      values: { name: "Между устройствами" },
      updatedAt: "2026-09-05T12:00:00.000Z",
    }));
  });

  it("selects the freshest draft when devices disagree", () => {
    const older = { values: { name: "Телефон" }, updatedAt: "2026-09-05T10:00:00.000Z" };
    const newer = { values: { name: "Компьютер" }, updatedAt: "2026-09-05T11:00:00.000Z" };

    expect(selectNewerProductDraft(older, newer)).toBe(newer);
    expect(selectNewerProductDraft(newer, older)).toBe(newer);
  });

  it("waits for an in-flight server write before product saving continues", async () => {
    let releaseWrite!: () => void;
    const serverWrite = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    const draft = createProductDraftController({
      key: "product:new",
      storage: createStorage(),
      getSnapshot: () => ({ values: { name: "Готовый товар" } }),
      onWrite: () => serverWrite,
    });

    draft.flush();
    let settled = false;
    const settling = draft.settle().then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    releaseWrite();
    await settling;
    expect(settled).toBe(true);
  });
});