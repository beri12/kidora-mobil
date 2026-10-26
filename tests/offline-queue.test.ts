import { createQueue, MAX_ATTEMPTS, type PendingOp, type QueueStorage } from '@/offline/queue';

function memory(): QueueStorage & { rows: Map<string, PendingOp> } {
  const rows = new Map<string, PendingOp>();
  return {
    rows,
    async all() { return [...rows.values()].map((r) => ({ ...r })); },
    async put(op) { rows.set(op.id, { ...op }); },
    async remove(id) { rows.delete(id); },
  };
}

const op = (id: string) => ({ id, kind: 'content.complete', method: 'POST' as const, path: `/learning/content/${id}/complete`, body: {} });

describe('offline queue', () => {
  it('keeps one operation per idempotency key', async () => {
    const q = createQueue(memory());
    await q.enqueue(op('a'));
    await q.enqueue(op('a'));
    expect(await q.pending()).toHaveLength(1);
  });

  it('sends in order and removes what the server accepted', async () => {
    const store = memory();
    const q = createQueue(store);
    await q.enqueue(op('a'));
    await new Promise((r) => setTimeout(r, 2));
    await q.enqueue(op('b'));
    const seen: string[] = [];
    const res = await q.sync(async (o) => {
      seen.push(o.id);
      return 'ok';
    });
    expect(seen).toEqual(['a', 'b']);
    expect(res).toEqual({ sent: 2, dropped: 0, left: 0 });
  });

  it('stops at the first retry so later operations are not sent out of order', async () => {
    const store = memory();
    const q = createQueue(store);
    await q.enqueue(op('a'));
    await new Promise((r) => setTimeout(r, 2));
    await q.enqueue(op('b'));
    const send = jest.fn(async () => 'retry' as const);
    const res = await q.sync(send);
    expect(send).toHaveBeenCalledTimes(1);
    expect(res.left).toBe(2);
    expect(store.rows.get('a')!.attempts).toBe(1);
  });

  it('drops operations the server rejects, and gives up after the attempt limit', async () => {
    const store = memory();
    const q = createQueue(store);
    await q.enqueue(op('rejected'));
    expect((await q.sync(async () => 'drop')).dropped).toBe(1);

    await q.enqueue(op('flaky'));
    for (let i = 0; i < MAX_ATTEMPTS; i++) await q.sync(async () => 'retry');
    expect(await q.pending()).toHaveLength(0);
  });

  it('treats a thrown sender as a retry and records the error', async () => {
    const store = memory();
    const q = createQueue(store);
    await q.enqueue(op('a'));
    await q.sync(async () => {
      throw new Error('offline');
    });
    expect(store.rows.get('a')).toMatchObject({ attempts: 1 });
  });

  it('runs one sync at a time', async () => {
    const q = createQueue(memory());
    await q.enqueue(op('a'));
    const send = jest.fn(async () => 'ok' as const);
    await Promise.all([q.sync(send), q.sync(send)]);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
