function createStore(storageArea) {
  let queue = Promise.resolve();
  const enqueue = (fn) => {
    const run = queue.then(fn);
    queue = run.catch(() => {});
    return run;
  };

  const read = async () => {
    const raw = await storageArea.get(['ids', 'lastSynced', 'lastError']);
    return { ids: raw.ids ?? [], lastSynced: raw.lastSynced ?? null, lastError: raw.lastError ?? null };
  };

  return {
    getState: () => queue.then(read),
    replaceAll: (ids, now) =>
      enqueue(() => storageArea.set({ ids: [...new Set(ids)], lastSynced: now, lastError: null })),
    setOne: (id, present) =>
      enqueue(async () => {
        const { ids } = await read();
        const set = new Set(ids);
        if (present) set.add(id); else set.delete(id);
        await storageArea.set({ ids: [...set] });
      }),
    recordError: (code, now) => enqueue(() => storageArea.set({ lastError: code, lastErrorAt: now })),
    has: async (ids) => {
      await queue;
      const known = new Set((await read()).ids);
      return ids.filter((id) => known.has(id));
    },
  };
}

if (typeof module !== 'undefined') module.exports = { createStore };
else (globalThis.IWC ??= {}).createStore = createStore;
