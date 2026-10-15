import {
  ApiErrorEnvelopeSchema,
  AudienceSchema,
  CATEGORY_CATALOG,
  CreatePostInputSchema,
  GivePerspectiveInputSchema,
  PerspectiveFeedbackInputSchema,
  RULES,
  SignUpInputSchema,
  UpdatePostInputSchema,
  UploadMediaInputSchema,
  ageFromBirthDate,
  sparkHintsFor,
} from '../src';

const uuid = '00000000-0000-4000-8000-000000000001';

describe('ageFromBirthDate', () => {
  it('counts whole years and respects birthdays not yet reached', () => {
    const today = new Date('2026-10-16T12:00:00Z');
    expect(ageFromBirthDate('2008-10-16', today)).toBe(18);
    expect(ageFromBirthDate('2008-10-17', today)).toBe(17);
    expect(ageFromBirthDate('1990-01-01', today)).toBe(36);
  });
});

describe('SignUpInputSchema', () => {
  const base = { email: ' Asha@Example.com ', password: 'correct-horse', acceptTerms: true as const };

  it('accepts an adult and normalizes the email', () => {
    const parsed = SignUpInputSchema.parse({ ...base, birthDate: '1995-03-02' });
    expect(parsed.email).toBe('asha@example.com');
  });

  it('rejects anyone under 18', () => {
    const year = new Date().getUTCFullYear() - 17;
    expect(SignUpInputSchema.safeParse({ ...base, birthDate: `${year}-01-01` }).success).toBe(false);
  });

  it('requires accepting the terms', () => {
    expect(SignUpInputSchema.safeParse({ ...base, acceptTerms: false, birthDate: '1995-03-02' }).success).toBe(false);
  });
});

describe('AudienceSchema', () => {
  it('requires 18+ and a valid range', () => {
    expect(AudienceSchema.safeParse({ genders: ['woman'], minAge: 18, maxAge: 25 }).success).toBe(true);
    expect(AudienceSchema.safeParse({ genders: ['woman'], minAge: 17, maxAge: 25 }).success).toBe(false);
    expect(AudienceSchema.safeParse({ genders: ['woman'], minAge: 30, maxAge: 25 }).success).toBe(false);
    expect(AudienceSchema.safeParse({ genders: [], minAge: 18, maxAge: 25 }).success).toBe(false);
  });
});

describe('posts', () => {
  it('only accepts focus areas that belong to the category', () => {
    const ok = CreatePostInputSchema.safeParse({
      kind: 'photo',
      mediaId: uuid,
      prompt: 'How does this outfit come across?',
      category: 'style',
      focusAreas: ['outfit', 'fit'],
    });
    expect(ok.success).toBe(true);

    const wrong = CreatePostInputSchema.safeParse({
      kind: 'photo',
      mediaId: uuid,
      prompt: 'How does this outfit come across?',
      category: 'style',
      focusAreas: ['tone'],
    });
    expect(wrong.success).toBe(false);
  });

  it('requires focus areas when the category changes', () => {
    expect(UpdatePostInputSchema.safeParse({ category: 'voice' }).success).toBe(false);
    expect(UpdatePostInputSchema.safeParse({ category: 'voice', focusAreas: ['tone'] }).success).toBe(true);
  });

  it('derives spark hints from the chosen focus areas', () => {
    expect(sparkHintsFor('looks', ['presence'])).toEqual([
      'How does their height or presence come across?',
    ]);
    expect(sparkHintsFor('voice', [])).toHaveLength(CATEGORY_CATALOG.voice.focusAreas.length);
  });
});

describe('media', () => {
  it('caps audio at 15 seconds and requires a duration', () => {
    const base = { kind: 'audio' as const, mimeType: 'audio/m4a', dataBase64: 'AAAA' };
    expect(UploadMediaInputSchema.safeParse({ ...base, durationSec: 15 }).success).toBe(true);
    expect(UploadMediaInputSchema.safeParse({ ...base, durationSec: 16 }).success).toBe(false);
    expect(UploadMediaInputSchema.safeParse(base).success).toBe(false);
  });

  it('rejects unsupported mime types', () => {
    expect(
      UploadMediaInputSchema.safeParse({ kind: 'photo', mimeType: 'image/gif', dataBase64: 'AAAA' }).success,
    ).toBe(false);
  });
});

describe('perspectives', () => {
  it('requires a comment of at least the minimum length', () => {
    const short = 'Too short';
    const long = 'x'.repeat(RULES.commentMinLength);
    expect(GivePerspectiveInputSchema.safeParse({ postId: uuid, comment: short }).success).toBe(false);
    const parsed = GivePerspectiveInputSchema.parse({ postId: uuid, comment: long });
    expect(parsed.chips).toEqual([]);
    expect(parsed.connect).toBe(false);
  });

  it('limits chips', () => {
    const comment = 'x'.repeat(RULES.commentMinLength);
    expect(
      GivePerspectiveInputSchema.safeParse({ postId: uuid, comment, chips: ['a', 'b', 'c', 'd'] }).success,
    ).toBe(false);
  });

  it('requires a reason for not helpful and only thanks helpful ones', () => {
    expect(PerspectiveFeedbackInputSchema.safeParse({ verdict: 'not_helpful' }).success).toBe(false);
    expect(PerspectiveFeedbackInputSchema.safeParse({ verdict: 'not_helpful', reason: 'vague' }).success).toBe(true);
    expect(
      PerspectiveFeedbackInputSchema.safeParse({ verdict: 'not_helpful', reason: 'vague', thankPrivately: true }).success,
    ).toBe(false);
  });
});

describe('error envelope', () => {
  it('parses a stable code', () => {
    const parsed = ApiErrorEnvelopeSchema.parse({
      error: { code: 'PERSPECTIVE_REQUIRED_BEFORE_CONNECT', message: 'Give them a perspective first.' },
    });
    expect(parsed.error.code).toBe('PERSPECTIVE_REQUIRED_BEFORE_CONNECT');
  });
});
