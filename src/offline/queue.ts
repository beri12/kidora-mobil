/**
 * Offline write queue.
 *
 * Only operations that are safe to replay are queued: marking a lesson
 * content item complete, saving lesson progress, finishing a lesson (the
 * server grants its XP once, however often it is replayed). Each carries a stable
 * idempotency key created when the learner did the thing, so a replay after
 * a lost response is recognisable. Game attempts, quiz submissions, rewards
 * and payments are never queued: the server scores them, and a delayed
 * replay could double-count.
 *
 * The server stays authoritative: a 4xx on replay (access revoked, lesson
 * deleted, already recorded) drops the operation instead of retrying forever.
 */

export interface PendingOp {
  id: string; // idempotency key
  kind: string; // e.g. "content.complete"
  method: 'POST' | 'PUT' | 'PATCH';
  path: string;
  body: unknown;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

export interface QueueStorage {
  all(): Promise<PendingOp[]>;
  put(op: PendingOp): Promise<void>;
  remove(id: string): Promise<void>;
}

export type SendResult = 'ok' | 'retry' | 'drop';
export type Sender = (op: PendingOp) => Promise<SendResult>;

export const MAX_ATTEMPTS = 8;

export function createQueue(storage: QueueStorage) {
  let syncing: Promise<{ sent: number; dropped: number; left: number }> | null = null;

  return {
    async enqueue(op: Omit<PendingOp, 'createdAt' | 'attempts'>) {
      const existing = (await storage.all()).find((o) => o.id === op.id);
      if (existing) return existing; // same key twice: one operation
      const full: PendingOp = { ...op, createdAt: Date.now(), attempts: 0 };
      await storage.put(full);
      return full;
    },

    pending: () => storage.all(),

    /** Oldest first; stops at the first "retry" so order is preserved. Single-flight. */
    sync(send: Sender) {
      if (!syncing) {
        syncing = (async () => {
          let sent = 0;
          let dropped = 0;
          const ops = (await storage.all()).sort((a, b) => a.createdAt - b.createdAt);
          for (const op of ops) {
            let result: SendResult;
            try {
              result = await send(op);
            } catch (e) {
              result = 'retry';
              op.lastError = e instanceof Error ? e.message : String(e);
            }
            if (result === 'ok') {
              await storage.remove(op.id);
              sent++;
            } else if (result === 'drop' || op.attempts + 1 >= MAX_ATTEMPTS) {
              await storage.remove(op.id);
              dropped++;
            } else {
              await storage.put({ ...op, attempts: op.attempts + 1 });
              break;
            }
          }
          const left = (await storage.all()).length;
          return { sent, dropped, left };
        })().finally(() => {
          syncing = null;
        });
      }
      return syncing;
    },
  };
}

export type OfflineQueue = ReturnType<typeof createQueue>;
