import { logger } from 'firebase-functions/v2';
import { db, admin } from './firestore';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export type NotifPayload = {
  token: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  dedupKey?: string;
};

export async function sendNotif(payload: NotifPayload): Promise<void> {
  const { token, title, body, data, dedupKey } = payload;

  if (!token || !token.startsWith('ExponentPushToken')) {
    logger.warn('notif_skip_invalid_token', { token: token?.slice(0, 12) });
    return;
  }

  // Dedup: cek log 24h terakhir
  if (dedupKey) {
    const logRef = db.collection('notifLog').doc(dedupKey);
    const logSnap = await logRef.get();
    if (logSnap.exists) {
      const ts = logSnap.data()?.sentAt?.toMillis?.() ?? 0;
      if (Date.now() - ts < 24 * 60 * 60 * 1000) {
        logger.info('notif_dedup_hit', { dedupKey });
        return;
      }
    }
    await logRef.set({
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      title,
    });
  }

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        title,
        body,
        data,
        sound: 'default',
        priority: 'high',
      }),
    });
    if (!res.ok) {
      logger.error('notif_send_failed', { status: res.status, dedupKey });
    }
  } catch (err) {
    logger.error('notif_send_error', { err: (err as Error).message, dedupKey });
  }
}
