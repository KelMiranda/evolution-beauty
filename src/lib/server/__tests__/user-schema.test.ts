import { describe, expect, it } from 'vitest';
import { extractUserSubmission, validateUserSubmission } from '../user-schema';

describe('user schema', () => {
  it('parses a valid submission', () => {
    const formData = new FormData();
    formData.set('email', 'admin@example.com');
    formData.set('password', 'supersecret');
    formData.set('fullName', 'Admin User');
    formData.set('role', 'admin');
    formData.set('active', 'true');

    expect(validateUserSubmission(formData).success).toBe(true);
  });

  it('extracts a normalized submission payload from form data', () => {
    const formData = new FormData();
    formData.set('email', 'user@example.com');
    formData.set('password', '12345678');
    formData.set('fullName', '  New User  ');
    formData.set('role', 'facilitadora');
    formData.set('active', 'on');

    expect(extractUserSubmission(formData)).toMatchObject({
      email: 'user@example.com',
      fullName: '  New User  ',
      role: 'facilitador',
      active: true,
    });
  });
});
