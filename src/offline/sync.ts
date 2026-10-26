import NetInfo from '@react-native-community/netinfo';
import { api } from '@/api';
import { ApiError } from '@/api/client';
import { createQueue, type PendingOp, type SendResult } from './queue';
import { sqliteQueueStorage } from './sqlite-storage';

export const offlineQueue = createQueue(sqliteQueueStorage);

/** Server verdict → queue action. 4xx means "never going to work": drop it. */
export function classify(e: unknown): SendResult {
  if (!(e instanceof ApiError)) return 'retry';
  if (e.isNetwork || e.isTimeout || e.status >= 500 || e.status === 429 || e.status === 401) return 'retry';
  return 'drop';
}

export async function sendOp(op: PendingOp): Promise<SendResult> {
  try {
    await api.request(op.method, op.path, { body: op.body, headers: { 'Idempotency-Key': op.id } });
    return 'ok';
  } catch (e) {
    return classify(e);
  }
}

export const syncNow = () => offlineQueue.sync(sendOp);

/** Replays queued writes whenever the device comes back online. */
export function startSync() {
  syncNow().catch(() => undefined);
  return NetInfo.addEventListener((s) => {
    if (s.isConnected && s.isInternetReachable !== false) syncNow().catch(() => undefined);
  });
}
