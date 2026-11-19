import { normalizeRole } from './roles';

describe('normalizeRole', () => {
  it('routes admin accounts to the admin app', () => {
    expect(normalizeRole('admin')).toBe('admin');
    expect(normalizeRole(' ADMIN ')).toBe('admin');
  });

  it('routes customer and unknown roles to the user app', () => {
    expect(normalizeRole('customer')).toBe('user');
    expect(normalizeRole(undefined)).toBe('user');
  });
});
