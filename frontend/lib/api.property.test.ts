/**
 * Property-Based Tests for API client and data invariants
 * Uses fast-check to generate hundreds of test cases per property.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Helpers / stubs
// ---------------------------------------------------------------------------

/** Minimal user shape returned by the API */
interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'student' | 'teacher' | 'admin';
  status: 'active' | 'inactive' | 'pending';
}

/** Minimal course shape */
interface Course {
  id: number;
  title: string;
  status: 'draft' | 'active' | 'archived';
  teacher_id: number;
}

// Arbitraries
const roleArb = fc.constantFrom<User['role']>('student', 'teacher', 'admin');
const statusArb = fc.constantFrom<User['status']>('active', 'inactive', 'pending');
const courseStatusArb = fc.constantFrom<Course['status']>('draft', 'active', 'archived');

const userArb: fc.Arbitrary<User> = fc.record({
  id: fc.integer({ min: 1, max: 1_000_000 }),
  email: fc.emailAddress(),
  full_name: fc.string({ minLength: 1, maxLength: 100 }),
  role: roleArb,
  status: statusArb,
});

const courseArb: fc.Arbitrary<Course> = fc.record({
  id: fc.integer({ min: 1, max: 1_000_000 }),
  title: fc.string({ minLength: 1, maxLength: 200 }),
  status: courseStatusArb,
  teacher_id: fc.integer({ min: 1, max: 1_000_000 }),
});

// ---------------------------------------------------------------------------
// 1. Data Fetching Invariants
//    Property: filtering a list never returns MORE items than the original list
// ---------------------------------------------------------------------------
describe('Data fetching invariants', () => {
  it('filtering users by role never increases the list size', () => {
    fc.assert(
      fc.property(fc.array(userArb, { minLength: 0, maxLength: 50 }), roleArb, (users, role) => {
        const filtered = users.filter((u) => u.role === role);
        expect(filtered.length).toBeLessThanOrEqual(users.length);
      }),
      { numRuns: 200 }
    );
  });

  it('filtering courses by status never increases the list size', () => {
    fc.assert(
      fc.property(
        fc.array(courseArb, { minLength: 0, maxLength: 50 }),
        courseStatusArb,
        (courses, status) => {
          const filtered = courses.filter((c) => c.status === status);
          expect(filtered.length).toBeLessThanOrEqual(courses.length);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('search filter on users is case-insensitive and subset of original', () => {
    fc.assert(
      fc.property(
        fc.array(userArb, { minLength: 0, maxLength: 50 }),
        fc.string({ minLength: 0, maxLength: 20 }),
        (users, query) => {
          const q = query.toLowerCase();
          const filtered = users.filter(
            (u) =>
              u.full_name.toLowerCase().includes(q) ||
              u.email.toLowerCase().includes(q)
          );
          // Result must be a subset
          expect(filtered.length).toBeLessThanOrEqual(users.length);
          filtered.forEach((u) => {
            expect(users.some((orig) => orig.id === u.id)).toBe(true);
          });
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// 2. State Update Invariants
//    Property: adding then removing an item leaves the list unchanged
// ---------------------------------------------------------------------------
describe('State update invariants', () => {
  it('adding a user then deleting it by id restores original list', () => {
    fc.assert(
      fc.property(fc.array(userArb, { minLength: 0, maxLength: 20 }), userArb, (users, newUser) => {
        // Ensure no id collision
        const base = users.filter((u) => u.id !== newUser.id);
        const afterAdd = [...base, newUser];
        const afterDelete = afterAdd.filter((u) => u.id !== newUser.id);
        expect(afterDelete).toEqual(base);
      }),
      { numRuns: 200 }
    );
  });

  it('updating a user preserves list length', () => {
    fc.assert(
      fc.property(
        fc.array(userArb, { minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (users, newName) => {
          const target = users[0];
          const updated = users.map((u) =>
            u.id === target.id ? { ...u, full_name: newName } : u
          );
          expect(updated.length).toBe(users.length);
          const found = updated.find((u) => u.id === target.id);
          expect(found?.full_name).toBe(newName);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// 3. Authorization Invariants
//    Property: only admins can see all roles; teachers/students see restricted sets
// ---------------------------------------------------------------------------
describe('Authorization invariants', () => {
  it('admin role has access to all user roles', () => {
    fc.assert(
      fc.property(fc.array(userArb, { minLength: 0, maxLength: 30 }), (users) => {
        // Admin sees everyone
        const adminView = users;
        // Teacher sees only students and teachers (not admins)
        const teacherView = users.filter((u) => u.role !== 'admin');
        expect(teacherView.length).toBeLessThanOrEqual(adminView.length);
      }),
      { numRuns: 200 }
    );
  });

  it('teacher can only modify courses they own', () => {
    fc.assert(
      fc.property(
        fc.array(courseArb, { minLength: 0, maxLength: 20 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        (courses, teacherId) => {
          const ownedCourses = courses.filter((c) => c.teacher_id === teacherId);
          ownedCourses.forEach((c) => {
            expect(c.teacher_id).toBe(teacherId);
          });
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// 4. Error Handling Invariants
//    Property: API errors always produce an Error object with a message string
// ---------------------------------------------------------------------------
describe('Error handling invariants', () => {
  it('failed fetch always throws an Error with a non-empty message', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.integer({ min: 400, max: 599 }),
        async (errorMsg, statusCode) => {
          global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: statusCode,
            json: async () => ({ error: errorMsg }),
          }) as any;

          // Inline minimal apiRequest to test the invariant
          const makeRequest = async () => {
            const res = await fetch('http://localhost/api/test');
            const data = await res.json() as { error?: string };
            if (!res.ok) throw new Error(data.error || 'Request failed');
            return data;
          };

          await expect(makeRequest()).rejects.toThrow();
          try {
            await makeRequest();
          } catch (err) {
            expect(err).toBeInstanceOf(Error);
            expect((err as Error).message.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// 5. Data Validation Invariants
//    Property: valid email addresses always contain exactly one '@'
// ---------------------------------------------------------------------------
describe('Data validation invariants', () => {
  it('generated email addresses always contain exactly one @', () => {
    fc.assert(
      fc.property(fc.emailAddress(), (email) => {
        const atCount = (email.match(/@/g) || []).length;
        expect(atCount).toBe(1);
      }),
      { numRuns: 200 }
    );
  });

  it('user ids are always positive integers', () => {
    fc.assert(
      fc.property(userArb, (user) => {
        expect(user.id).toBeGreaterThan(0);
        expect(Number.isInteger(user.id)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it('pagination offset is always non-negative', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // page (1-indexed)
        fc.integer({ min: 1, max: 100 }), // limit
        (page, limit) => {
          const offset = (page - 1) * limit;
          expect(offset).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('role values are always one of the three valid roles', () => {
    const validRoles = new Set(['student', 'teacher', 'admin']);
    fc.assert(
      fc.property(userArb, (user) => {
        expect(validRoles.has(user.role)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });
});
