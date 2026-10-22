'use client';

import React from 'react';
import type { OrderDetail } from '@/lib/api/types';

type OrderProgressStepperProps = {
  order: OrderDetail;
};

interface StepInfo {
  id: string;
  title: string;
  subtitle: string;
  date?: string | null;
  isComplete: boolean;
  isCurrent: boolean;
}

export function OrderProgressStepper({ order }: OrderProgressStepperProps) {
  const isCancelled = order.status === 'CANCELLED';

  // Calculate step completion based on order state
  const isPaid = order.paymentStatus === 'PAID';
  const isProcessing =
    order.fulfillmentStatus === 'PROCESSING' ||
    order.fulfillmentStatus === 'SHIPPED' ||
    order.fulfillmentStatus === 'FULFILLED';
  const isShipped =
    order.fulfillmentStatus === 'SHIPPED' ||
    order.fulfillmentStatus === 'FULFILLED';
  const isDelivered = order.fulfillmentStatus === 'FULFILLED';

  // Determine current active step index (0 to 4)
  let activeIndex = 0;
  if (isDelivered) {
    activeIndex = 4;
  } else if (isShipped) {
    activeIndex = 3;
  } else if (isProcessing) {
    activeIndex = 2;
  } else if (isPaid) {
    activeIndex = 2; // Payment is done, now awaiting/in processing
  } else {
    activeIndex = 1; // Order placed, awaiting payment
  }

  const steps: StepInfo[] = [
    {
      id: 'placed',
      title: 'Order Placed',
      subtitle: 'Order confirmed & recorded',
      date: order.placedAt,
      isComplete: true,
      isCurrent: !isPaid && activeIndex === 0,
    },
    {
      id: 'payment',
      title: 'Payment Cleared',
      subtitle: isPaid
        ? 'Escrow verified & funded'
        : order.paymentStatus === 'FAILED'
        ? 'Payment failed — retry'
        : 'Awaiting payment / UTR',
      date: isPaid
        ? order.transactions?.find((t) => t.status === 'SUCCESS')?.createdAt || null
        : null,
      isComplete: isPaid,
      isCurrent: !isPaid && !isCancelled,
    },
    {
      id: 'processing',
      title: 'Processing & Prep',
      subtitle: isProcessing
        ? 'Payload tested & packed'
        : 'Vendor QA inspection',
      isComplete: isProcessing,
      isCurrent: isPaid && !isShipped && !isCancelled,
    },
    {
      id: 'shipped',
      title: 'Dispatched & Transit',
      subtitle: isShipped
        ? order.carrierName
          ? `Via ${order.carrierName}`
          : 'In transit to buyer'
        : 'Carrier handover pending',
      date: order.dispatchedAt,
      isComplete: isShipped,
      isCurrent: isShipped && !isDelivered && !isCancelled,
    },
    {
      id: 'delivered',
      title: 'Delivered',
      subtitle: isDelivered ? 'Delivery confirmed' : 'Awaiting receipt & sign-off',
      date: order.deliveredAt,
      isComplete: isDelivered,
      isCurrent: isDelivered,
    },
  ];

  if (isCancelled) {
    return (
      <div
        style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 12,
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          color: '#991b1b',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: '#fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            flexShrink: 0,
          }}
        >
          ✕
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>
            Order Cancelled
          </div>
          <div style={{ fontSize: '0.85rem', color: '#b91c1c' }}>
            This order was cancelled. Fulfillment and active tracking have been discontinued.
          </div>
        </div>
      </div>
    );
  }

  // Calculate progress percentage for connector bar
  const completedCount = steps.filter((s) => s.isComplete).length;
  const progressPercent = Math.min(
    100,
    Math.max(0, ((completedCount - 1) / (steps.length - 1)) * 100),
  );

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>Fulfillment & Logistics Milestone</span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.15rem 0.55rem',
                borderRadius: 20,
                background: isDelivered
                  ? '#dcfce7'
                  : isShipped
                  ? '#dbeafe'
                  : isProcessing
                  ? '#fef3c7'
                  : '#f1f5f9',
                color: isDelivered
                  ? '#166534'
                  : isShipped
                  ? '#1e40af'
                  : isProcessing
                  ? '#92400e'
                  : '#475569',
              }}
            >
              {isDelivered
                ? 'COMPLETED'
                : isShipped
                ? 'IN TRANSIT'
                : isProcessing
                ? 'PREPARING DISPATCH'
                : 'PENDING'}
            </span>
          </h3>
          <p
            style={{
              margin: '0.25rem 0 0',
              fontSize: '0.825rem',
              color: '#64748b',
            }}
          >
            Real-time status synced between buyer organization and vendor fulfillment team.
          </p>
        </div>

        {order.estimatedDeliveryAt && !isDelivered && (
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '0.4rem 0.85rem',
              borderRadius: 8,
              fontSize: '0.8rem',
              color: '#334155',
            }}
          >
            <span style={{ color: '#64748b' }}>Estimated Arrival:</span>{' '}
            <strong style={{ color: '#0f172a' }}>
              {new Date(order.estimatedDeliveryAt).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </strong>
          </div>
        )}
      </div>

      {/* Stepper Graphic */}
      <div style={{ position: 'relative', margin: '1rem 0 0.5rem' }}>
        {/* Background track line */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '5%',
            right: '5%',
            height: 4,
            background: '#e2e8f0',
            borderRadius: 2,
            zIndex: 1,
          }}
        />

        {/* Active progress fill line */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '5%',
            width: `${progressPercent * 0.9}%`,
            height: 4,
            background: 'linear-gradient(90deg, #2f5233 0%, #16a34a 100%)',
            borderRadius: 2,
            zIndex: 2,
            transition: 'width 0.4s ease-in-out',
          }}
        />

        {/* Steps Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${steps.length}, 1fr)`,
            position: 'relative',
            zIndex: 3,
          }}
        >
          {steps.map((step, idx) => {
            const isCompleted = step.isComplete;
            const isCurrent = step.isCurrent;

            return (
              <div
                key={step.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  padding: '0 0.25rem',
                }}
              >
                {/* Step Circle */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: isCompleted
                      ? '#16a34a'
                      : isCurrent
                      ? '#ffffff'
                      : '#ffffff',
                    border: isCompleted
                      ? '3px solid #16a34a'
                      : isCurrent
                      ? '3px solid #2f5233'
                      : '3px solid #cbd5e1',
                    color: isCompleted ? '#ffffff' : isCurrent ? '#2f5233' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    boxShadow: isCurrent
                      ? '0 0 0 4px rgba(47, 82, 51, 0.18)'
                      : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isCompleted ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Step Text */}
                <div style={{ marginTop: '0.65rem' }}>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: isCurrent || isCompleted ? 700 : 500,
                      color: isCurrent
                        ? '#0f172a'
                        : isCompleted
                        ? '#1e293b'
                        : '#94a3b8',
                    }}
                  >
                    {step.title}
                  </div>
                  <div
                    style={{
                      fontSize: '0.725rem',
                      color: isCurrent ? '#2f5233' : '#64748b',
                      fontWeight: isCurrent ? 600 : 400,
                      marginTop: '0.15rem',
                      lineHeight: 1.3,
                    }}
                  >
                    {step.subtitle}
                  </div>
                  {step.date && (
                    <div
                      style={{
                        fontSize: '0.68rem',
                        color: '#94a3b8',
                        marginTop: '0.2rem',
                      }}
                    >
                      {new Date(step.date).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
