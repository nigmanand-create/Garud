'use client';

import { useState } from 'react';
import {
  createPaymentIntent,
  ESCROW_BANK_DETAILS,
  loadRazorpayScript,
  submitBankTransfer,
  verifyRazorpayPayment,
} from '@/lib/api/payments';
import { formatPrice } from '@/lib/platform/labels';
import { ApiError } from '@/lib/api/types';

interface PaymentGatewayModalProps {
  orderId: string;
  totalInr: string;
  companyName: string;
  contactName: string;
  contactPhone: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentId?: string) => void;
}

export function PaymentGatewayModal({
  orderId,
  totalInr,
  companyName,
  contactName,
  contactPhone,
  isOpen,
  onClose,
  onSuccess,
}: PaymentGatewayModalProps) {
  const [activeTab, setActiveTab] = useState<'ONLINE' | 'BANK_TRANSFER'>('ONLINE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Bank Transfer Form
  const [utrNumber, setUtrNumber] = useState('');
  const [senderBank, setSenderBank] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  // Sandbox simulation state
  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [sandboxOrderData, setSandboxOrderData] = useState<any>(null);
  const [selectedSandboxMethod, setSelectedSandboxMethod] = useState<'UPI' | 'NETBANKING' | 'CARD'>('UPI');

  if (!isOpen) return null;

  function copyToClipboard(text: string, label: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    }
  }

  async function handleInitiateOnlinePayment() {
    setError(null);
    setLoading(true);
    try {
      const intent = await createPaymentIntent(orderId, 'RAZORPAY');

      // If in Sandbox Simulation Mode (no live Razorpay API keys configured)
      if (intent.sandboxMode) {
        setSandboxOrderData(intent);
        setShowSandboxModal(true);
        setLoading(false);
        return;
      }

      // Live / Sandbox Razorpay with Keys
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !(window as any).Razorpay) {
        // Fallback to interactive test sandbox modal if script blocked
        setSandboxOrderData(intent);
        setShowSandboxModal(true);
        setLoading(false);
        return;
      }

      const options = {
        key: intent.keyId,
        amount: intent.amountPaise,
        currency: intent.currency,
        name: 'Garud Hub Drone Platform',
        description: `Order #${orderId.slice(0, 8)}`,
        order_id: intent.gatewayOrderId,
        prefill: {
          name: contactName,
          contact: contactPhone,
        },
        theme: {
          color: '#2f5233',
        },
        handler: async function (response: any) {
          try {
            setLoading(true);
            await verifyRazorpayPayment({
              orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            onSuccess(response.razorpay_payment_id);
          } catch (vErr) {
            setError(vErr instanceof ApiError ? vErr.message : 'Payment verification failed');
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
      setLoading(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to initialize payment gateway');
      setLoading(false);
    }
  }

  async function handleSimulateSandboxPayment() {
    if (!sandboxOrderData) return;
    setError(null);
    setLoading(true);
    try {
      const mockPaymentId = `pay_sand_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      await verifyRazorpayPayment({
        orderId,
        razorpayOrderId: sandboxOrderData.gatewayOrderId,
        razorpayPaymentId: mockPaymentId,
        razorpaySignature: 'sandbox_verified_signature',
      });
      setShowSandboxModal(false);
      onSuccess(mockPaymentId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sandbox payment failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitUtr(e: React.FormEvent) {
    e.preventDefault();
    if (!utrNumber.trim()) {
      setError('Please enter your Bank UTR or Transaction Reference number.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await submitBankTransfer({
        orderId,
        utrNumber: utrNumber.trim(),
        senderBankName: senderBank.trim() || undefined,
        notes: transferNotes.trim() || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit bank transfer');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: 620,
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>
              Garud Hub Payment Center
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Order #{orderId.slice(0, 8)} · Amount:{' '}
              <strong style={{ color: '#15803d' }}>{formatPrice(false, totalInr)}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: '#64748b',
              padding: '0.25rem 0.5rem',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Selector */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            background: '#f1f5f9',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('ONLINE');
              setError(null);
            }}
            style={{
              flex: 1,
              padding: '0.85rem 1rem',
              border: 'none',
              background: activeTab === 'ONLINE' ? '#ffffff' : 'transparent',
              fontWeight: activeTab === 'ONLINE' ? 600 : 500,
              color: activeTab === 'ONLINE' ? '#2f5233' : '#64748b',
              borderBottom: activeTab === 'ONLINE' ? '2px solid #2f5233' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
            }}
          >
            ⚡ Instant Online Gateway (Razorpay)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('BANK_TRANSFER');
              setError(null);
            }}
            style={{
              flex: 1,
              padding: '0.85rem 1rem',
              border: 'none',
              background: activeTab === 'BANK_TRANSFER' ? '#ffffff' : 'transparent',
              fontWeight: activeTab === 'BANK_TRANSFER' ? 600 : 500,
              color: activeTab === 'BANK_TRANSFER' ? '#2f5233' : '#64748b',
              borderBottom: activeTab === 'BANK_TRANSFER' ? '2px solid #2f5233' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
            }}
          >
            🏦 Corporate NEFT / RTGS Wire
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '1.5rem' }}>
          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                color: '#b91c1c',
                padding: '0.75rem 1rem',
                borderRadius: 8,
                marginBottom: '1rem',
                fontSize: '0.875rem',
              }}
            >
              {error}
            </div>
          )}

          {/* TAB 1: ONLINE RAZORPAY GATEWAY */}
          {activeTab === 'ONLINE' && (
            <div>
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 10,
                  padding: '1.25rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>🔒</span>
                  <strong style={{ color: '#166534', fontSize: '0.95rem' }}>
                    100% Secure Instant Settlement
                  </strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.825rem', color: '#15803d', lineHeight: 1.5 }}>
                  Pay via UPI (Google Pay, PhonePe, Paytm), Corporate Credit/Debit Cards, or 50+ NetBanking banks. Order confirmation is verified instantly via HMAC-SHA256 signature.
                </p>
              </div>

              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  background: '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Order Invoice Total:</span>
                  <strong>{formatPrice(false, totalInr)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Billing Entity:</span>
                  <span>{companyName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Contact Phone:</span>
                  <span>{contactPhone}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleInitiateOnlinePayment}
                disabled={loading}
                className="platform-btn platform-btn-cta platform-btn-full"
                style={{
                  fontSize: '1rem',
                  padding: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                {loading ? 'Initializing Gateway…' : `Pay ${formatPrice(false, totalInr)} Online`}
              </button>
            </div>
          )}

          {/* TAB 2: CORPORATE BANK TRANSFER (NEFT/RTGS) */}
          {activeTab === 'BANK_TRANSFER' && (
            <form onSubmit={handleSubmitUtr}>
              <div
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 10,
                  padding: '1.25rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>🏛</span>
                  <strong style={{ color: '#1e40af', fontSize: '0.95rem' }}>
                    Platform Escrow Account Details
                  </strong>
                </div>
                <p style={{ margin: '0 0 0.85rem', fontSize: '0.825rem', color: '#1d4ed8' }}>
                  Transfer the exact order total of <strong>{formatPrice(false, totalInr)}</strong> from your corporate bank account:
                </p>

                {/* Bank Account Details Grid */}
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: 8,
                    padding: '0.75rem',
                    border: '1px solid #dbeafe',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                    fontSize: '0.825rem',
                  }}
                >
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Account Holder</span>
                    <strong style={{ color: '#0f172a' }}>{ESCROW_BANK_DETAILS.accountName}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Bank Name</span>
                    <strong style={{ color: '#0f172a' }}>{ESCROW_BANK_DETAILS.bankName}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Account Number</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>
                        {ESCROW_BANK_DETAILS.accountNumber}
                      </strong>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(ESCROW_BANK_DETAILS.accountNumber, 'acc')}
                        style={{
                          border: 'none',
                          background: '#e0e7ff',
                          color: '#3730a3',
                          borderRadius: 4,
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          cursor: 'pointer',
                        }}
                      >
                        {copiedField === 'acc' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>IFSC Code</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>
                        {ESCROW_BANK_DETAILS.ifscCode}
                      </strong>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(ESCROW_BANK_DETAILS.ifscCode, 'ifsc')}
                        style={{
                          border: 'none',
                          background: '#e0e7ff',
                          color: '#3730a3',
                          borderRadius: 4,
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          cursor: 'pointer',
                        }}
                      >
                        {copiedField === 'ifsc' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* UTR Submission Form Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    UTR / Transaction Reference Number <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    required
                    placeholder="e.g. HDFC0012398741 or 16-22 digit UTR"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      fontFamily: 'monospace',
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                    Available in your netbanking transfer confirmation receipt.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      Sender Bank Name (Optional)
                    </label>
                    <input
                      placeholder="e.g. SBI, ICICI, Axis"
                      value={senderBank}
                      onChange={(e) => setSenderBank(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      Transfer Remarks (Optional)
                    </label>
                    <input
                      placeholder="e.g. Advance 100% payment"
                      value={transferNotes}
                      onChange={(e) => setTransferNotes(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                      }}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !utrNumber.trim()}
                className="platform-btn platform-btn-cta platform-btn-full"
                style={{
                  fontSize: '1rem',
                  padding: '0.85rem',
                }}
              >
                {loading ? 'Submitting UTR…' : 'Submit Bank Transfer UTR for Verification'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Interactive Sandbox Simulation Modal */}
      {showSandboxModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 480,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
            }}
          >
            {/* Simulation Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
                color: '#ffffff',
                padding: '1.25rem',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  display: 'inline-block',
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: '#93c5fd',
                  borderRadius: 20,
                  padding: '2px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  marginBottom: '0.4rem',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Sandbox Gateway Test Mode
              </div>
              <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem', color: '#ffffff' }}>
                Garud Hub Razorpay Checkout
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                Total: <strong style={{ color: '#4ade80' }}>{formatPrice(false, totalInr)}</strong>
              </p>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                Select a test payment method to simulate instant payment settlement:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {[
                  { id: 'UPI', label: '⚡ Instant UPI (GooglePay / BHIM)', desc: 'Auto-approved mock UPI handle' },
                  { id: 'NETBANKING', label: '🏦 Corporate NetBanking (HDFC/ICICI/SBI)', desc: 'Direct corporate treasury debit' },
                  { id: 'CARD', label: '💳 Corporate VISA / Mastercard', desc: 'Test commercial credit card' },
                ].map((item) => (
                  <label
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: 8,
                      border:
                        selectedSandboxMethod === item.id ? '2px solid #2f5233' : '1px solid #e2e8f0',
                      background: selectedSandboxMethod === item.id ? '#f0fdf4' : '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="sandboxMethod"
                      checked={selectedSandboxMethod === item.id}
                      onChange={() => setSelectedSandboxMethod(item.id as any)}
                      style={{ marginTop: 3 }}
                    />
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowSandboxModal(false)}
                  disabled={loading}
                  className="platform-btn platform-btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSimulateSandboxPayment}
                  disabled={loading}
                  className="platform-btn platform-btn-cta"
                  style={{ flex: 1.5 }}
                >
                  {loading ? 'Verifying…' : 'Complete Test Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
