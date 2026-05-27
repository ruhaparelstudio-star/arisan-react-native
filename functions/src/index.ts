import { onCall } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';

setGlobalOptions({ region: 'asia-southeast2', maxInstances: 10 });

// Hello world untuk verifikasi deployment
export const helloWorld = onCall((req) => {
  return { message: 'Hello from asia-southeast2', uid: req.auth?.uid ?? null };
});

export { rateLimitOTP } from './callable/rateLimitOTP';
export { createGroup } from './callable/createGroup';
export { joinViaCode } from './callable/joinViaCode';
