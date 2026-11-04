import {
  hmacSha256Hex,
  isProductionDeploy,
  readRazorpayCredentials,
  safeEqualHex,
  verifyOrderPaymentSignature,
  verifySubscriptionPaymentSignature,
  verifyWebhookSignature,
} from './razorpay.util';

describe('razorpay.util', () => {
  it('detects production deploy only for GARUD_DEPLOY_ENV=production', () => {
    expect(isProductionDeploy({ GARUD_DEPLOY_ENV: 'production' })).toBe(true);
    expect(isProductionDeploy({ GARUD_DEPLOY_ENV: 'staging' })).toBe(false);
    expect(isProductionDeploy({ NODE_ENV: 'production' })).toBe(false);
  });

  it('safeEqualHex handles empty / mismatched input', () => {
    expect(safeEqualHex('', 'a')).toBe(false);
    expect(safeEqualHex('abc', 'abcd')).toBe(false);
    expect(safeEqualHex('abcd', 'abcd')).toBe(true);
  });

  it('verifies webhook signatures over the raw body', () => {
    const body = '{"event":"payment.captured"}';
    const sig = hmacSha256Hex(body, 'whsec');
    expect(verifyWebhookSignature(body, sig, 'whsec')).toBe(true);
    expect(verifyWebhookSignature(body + ' ', sig, 'whsec')).toBe(false);
    expect(verifyWebhookSignature(body, undefined, 'whsec')).toBe(false);
    expect(verifyWebhookSignature(body, sig, 'other')).toBe(false);
  });

  it('verifies order and subscription checkout signatures', () => {
    const o = hmacSha256Hex('order_1|pay_1', 'sec');
    expect(verifyOrderPaymentSignature('order_1', 'pay_1', o, 'sec')).toBe(
      true,
    );
    expect(verifyOrderPaymentSignature('order_2', 'pay_1', o, 'sec')).toBe(
      false,
    );
    const s = hmacSha256Hex('pay_1|sub_1', 'sec');
    expect(verifySubscriptionPaymentSignature('pay_1', 'sub_1', s, 'sec')).toBe(
      true,
    );
    expect(verifySubscriptionPaymentSignature('pay_1', 'sub_2', s, 'sec')).toBe(
      false,
    );
  });

  it('ignores missing or placeholder credentials', () => {
    const env = (m: Record<string, string>) => (k: string) => m[k];
    expect(readRazorpayCredentials(env({}))).toBeNull();
    expect(
      readRazorpayCredentials(
        env({
          RAZORPAY_KEY_ID: 'rzp_test_placeholder',
          RAZORPAY_KEY_SECRET: 'x',
        }),
      ),
    ).toBeNull();
    expect(
      readRazorpayCredentials(
        env({ RAZORPAY_KEY_ID: 'rzp_test_abc', RAZORPAY_KEY_SECRET: 'x' }),
      ),
    ).toEqual({ keyId: 'rzp_test_abc', keySecret: 'x' });
  });
});
