import crypto from 'crypto';

// This service imitates how Razorpay works:
//   1. The server creates an ORDER.
//   2. The customer pays on the gateway's checkout, and the gateway returns a payment id and a SIGNATURE.
//   3. The server re-computes the signature with the secret key and only trusts the payment if it matches.
// Here the "gateway" is our own simulator, so no account or real money is needed.

const secret = () => process.env.PAYMENT_SECRET || process.env.JWT_SECRET;

export const generateId = (prefix) => `${prefix}_${crypto.randomBytes(9).toString('hex')}`;

export const signPayment = (orderId, paymentId) =>
  crypto.createHmac('sha256', secret()).update(`${orderId}|${paymentId}`).digest('hex');

export const verifySignature = (orderId, paymentId, signature) => {
  if (typeof signature !== 'string') return false;
  const expected = Buffer.from(signPayment(orderId, paymentId), 'hex');
  const given = Buffer.from(signature, 'hex');
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
};

// Test cards, like the ones real gateways publish for test mode.
export const TEST_CARDS = {
  4111111111111111: 'success',
  4000000000000002: 'declined',
};
