import {
  PerspectiveRequestSchema,
  PerspectiveResponseSchema,
  SubmitFeedbackInputSchema,
  ApiErrorEnvelopeSchema,
  ConnectionMode,
} from '../src';

describe('Perspective Contracts & Invariants', () => {
  it('validates a structured perspective response input', () => {
    const validFeedback = {
      responseId: 'resp_123',
      rating: 'helpful',
      thankPrivately: true,
      connectionIntent: 'friends',
      idempotencyKey: '00000000-0000-0000-0000-000000000001',
    };

    const parsed = SubmitFeedbackInputSchema.parse(validFeedback);
    expect(parsed.rating).toBe('helpful');
    expect(parsed.connectionIntent).toBe('friends');
  });

  it('rejects an invalid rating outside the schema', () => {
    const invalidFeedback = {
      responseId: 'resp_123',
      rating: 'super_awesome', // Invalid per enum
      idempotencyKey: '00000000-0000-0000-0000-000000000001',
    };

    expect(() => SubmitFeedbackInputSchema.parse(invalidFeedback)).toThrow();
  });

  it('validates API error envelope with stable error code', () => {
    const errorPayload = {
      error: {
        code: 'REQUEST_NOT_ELIGIBLE',
        message: 'This request is no longer available in your finite batch.',
        requestId: 'req_trace_456',
        details: null,
      },
    };

    const parsed = ApiErrorEnvelopeSchema.parse(errorPayload);
    expect(parsed.error.code).toBe('REQUEST_NOT_ELIGIBLE');
  });

  it('enforces connection mode options', () => {
    const validModes: ConnectionMode[] = ['chat', 'friends', 'date', 'collaborate', 'network'];
    expect(validModes.length).toBe(5);
  });
});
