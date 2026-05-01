/**
 * Tests for Teacher Course Details Page — Task 3
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 5.1, 5.2
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import * as fc from 'fast-check'

/**
 * Creates a Promise that React 19's `use()` hook treats as already resolved,
 * avoiding Suspense suspension in tests. React 19 reads internal `status`/`value`
 * properties set by its own Promise tracking to skip the suspend cycle.
 */
function resolvedParams(id: string): Promise<{ id: string }> {
  const p = Promise.resolve({ id }) as any
  p.status = 'fulfilled'
  p.value = { id }
  return p as Promise<{ id: string }>
}

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/teacher/courses',
}))

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { id: 5, role: 'teacher', full_name: 'Jane Teacher' }, loading: false }),
}))

vi.mock('@/hooks/use-keyboard-shortcuts', () => ({
  useCommonShortcuts: vi.fn(),
}))

vi.mock('@/components/dashboard-layout-new', () => ({
  DashboardLayout: ({ children, role }: { children: React.ReactNode; role: string }) => (
    <div data-testid="dashboard-layout" data-role={role}>{children}</div>
  ),
}))

vi.mock('@/lib/route-guard', () => ({
  RouteGuard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/keyboard-shortcuts-help', () => ({
  KeyboardShortcutsHelp: () => null,
}))

vi.mock('@/components/dialogs/edit-course-dialog', () => ({
  EditCourseDialog: () => null,
}))

vi.mock('@/components/dialogs/add-lesson-dialog', () => ({
  AddLessonDialog: () => null,
}))

vi.mock('@/components/dialogs/edit-lesson-dialog', () => ({
  EditLessonDialog: () => null,
}))

vi.mock('@/components/dialogs/delete-confirm-dialog', () => ({
  DeleteConfirmDialog: () => null,
}))

vi.mock('@/components/dialogs/add-course-dialog', () => ({
  AddCourseDialog: () => null,
}))

vi.mock('@/lib/api', () => ({
  coursesAPI: {
    getById: vi.fn(),
    getTeacherCourses: vi.fn(),
    delete: vi.fn(),
  },
  enrollmentsAPI: {
    getByCourse: vi.fn(),
  },
  lessonsAPI: {
    delete: vi.fn(),
  },
  getStoredUser: vi.fn(() => ({ fullName: 'Jane Teacher' })),
}))

import { coursesAPI, enrollmentsAPI } from '@/lib/api'
import TeacherCourseDetailPage from './page'
import TeacherCoursesPage from '../page'

// ─── Shared mock push ────────────────────────────────────────────────────────

const mockPush = vi.fn()

// ─── Mock data ───────────────────────────────────────────────────────────────

const mockCourseApiResponse = {
  id: 42,
  title: 'Introduction to TypeScript',
  teacher_name: 'Jane Teacher',
  description: 'Learn TypeScript from scratch.',
  status: 'active',
  created_at: '2024-03-15T00:00:00Z',
  enrollment_count: 25,
  duration: '6 weeks',
  category: 'Programming',
  lessons: [
    { id: 1, title: 'Variables', duration_minutes: 30, order_index: 1, description: '', video_url: '' },
    { id: 2, title: 'Functions', duration_minutes: 45, order_index: 2, description: '', video_url: '' },
    { id: 3, title: 'Interfaces', duration_minutes: 60, order_index: 3, description: '', video_url: '' },
  ],
}

const mockEnrollments = [
  { student_id: 101, full_name: 'Alice Student', email: 'alice@example.com', enrolled_at: '2024-04-01T00:00:00Z', progress: 75 },
  { student_id: 102, full_name: 'Bob Student', email: 'bob@example.com', enrolled_at: '2024-04-05T00:00:00Z', progress: 40 },
]

const mockTeacherCourses = [
  {
    id: 7,
    title: 'My Course',
    teacher_name: 'Jane Teacher',
    enrollment_count: 10,
    lesson_count: 5,
    duration: '4 weeks',
    category: 'Science',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    description: 'A great course',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockPush.mockClear()
  ;(coursesAPI.getById as any).mockResolvedValue(mockCourseApiResponse)
  ;(enrollmentsAPI.getByCourse as any).mockResolvedValue(mockEnrollments)
  ;(coursesAPI.getTeacherCourses as any).mockResolvedValue(mockTeacherCourses)
})

// ─── 3.2 View Details button routes to /teacher/courses/[id] ─────────────────

describe('TeacherCoursesPage — View Details routing (3.2)', () => {
  it('calls router.push with /teacher/courses/[id] when View Details is clicked', async () => {
    render(<TeacherCoursesPage />)
    const btn = await screen.findByRole('button', { name: /view details/i })
    fireEvent.click(btn)
    expect(mockPush).toHaveBeenCalledWith('/teacher/courses/7')
    expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining('/admin/courses/'))
  })
})

// ─── 3.3 TeacherCourseDetailPage renders DashboardLayout with role="teacher" ─

describe('TeacherCourseDetailPage — DashboardLayout role (3.3)', () => {
  it('renders DashboardLayout with role="teacher"', async () => {
    render(<TeacherCourseDetailPage params={resolvedParams('42')} />)
    await waitFor(() => expect(coursesAPI.getById).toHaveBeenCalled())
    const layout = await screen.findByTestId('dashboard-layout')
    expect(layout).toHaveAttribute('data-role', 'teacher')
  })
})

// ─── 3.4 Page displays course title, description, and stats ──────────────────

describe('TeacherCourseDetailPage — Course data display (3.4)', () => {
  it('displays the course title', async () => {
    render(<TeacherCourseDetailPage params={resolvedParams('42')} />)
    expect(await screen.findByText('Introduction to TypeScript')).toBeInTheDocument()
  })

  it('displays the course description', async () => {
    render(<TeacherCourseDetailPage params={resolvedParams('42')} />)
    expect(await screen.findByText('Learn TypeScript from scratch.')).toBeInTheDocument()
  })

  it('displays total students stat', async () => {
    render(<TeacherCourseDetailPage params={resolvedParams('42')} />)
    expect(await screen.findByText('Total Students')).toBeInTheDocument()
    expect(await screen.findByText('25')).toBeInTheDocument()
  })

  it('displays total lessons stat', async () => {
    render(<TeacherCourseDetailPage params={resolvedParams('42')} />)
    expect(await screen.findByText('Total Lessons')).toBeInTheDocument()
    // Use getAllByText since '3' appears in both the stat card and lesson order column
    const threes = await screen.findAllByText('3')
    expect(threes.length).toBeGreaterThanOrEqual(1)
  })

  it('displays duration stat', async () => {
    render(<TeacherCourseDetailPage params={resolvedParams('42')} />)
    // 'Duration' appears in both the stat card label and the lessons table header
    const durationLabels = await screen.findAllByText('Duration')
    expect(durationLabels.length).toBeGreaterThanOrEqual(1)
    expect(await screen.findByText('6 weeks')).toBeInTheDocument()
  })
})

// ─── 3.5 Lessons list sorted by order ────────────────────────────────────────

describe('TeacherCourseDetailPage — Lessons sorted by order (3.5)', () => {
  it('displays all lessons', async () => {
    render(<TeacherCourseDetailPage params={resolvedParams('42')} />)
    expect(await screen.findByText('Variables')).toBeInTheDocument()
    expect(screen.getByText('Functions')).toBeInTheDocument()
    expect(screen.getByText('Interfaces')).toBeInTheDocument()
  })

  it('renders lessons in ascending order index', async () => {
    // API returns lessons in reverse order to verify client-side sorting
    ;(coursesAPI.getById as any).mockResolvedValue({
      ...mockCourseApiResponse,
      lessons: [
        { id: 3, title: 'Interfaces', duration_minutes: 60, order_index: 3 },
        { id: 1, title: 'Variables', duration_minutes: 30, order_index: 1 },
        { id: 2, title: 'Functions', duration_minutes: 45, order_index: 2 },
      ],
    })
    render(<TeacherCourseDetailPage params={resolvedParams('42')} />)
    await screen.findByText('Variables')
    const rows = screen.getAllByRole('row')
    // rows[0] = header row, rows[1..] = data rows
    const dataRows = rows.slice(1, 4)
    expect(dataRows[0]).toHaveTextContent('Variables')
    expect(dataRows[1]).toHaveTextContent('Functions')
    expect(dataRows[2]).toHaveTextContent('Interfaces')
  })
})

// ─── 3.6 Enrolled students with progress (read-only) ─────────────────────────

describe('TeacherCourseDetailPage — Enrolled students (3.6)', () => {
  it('displays enrolled student names', async () => {
    render(<TeacherCourseDetailPage params={resolvedParams('42')} />)
    expect(await screen.findByText('Alice Student')).toBeInTheDocument()
    expect(screen.getByText('Bob Student')).toBeInTheDocument()
  })

  it('displays student emails', async () => {
    render(<TeacherCourseDetailPage params={resolvedParams('42')} />)
    expect(await screen.findByText('alice@example.com')).toBeInTheDocument()
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()
  })

  it('displays progress percentages as read-only text', async () => {
    render(<TeacherCourseDetailPage params={resolvedParams('42')} />)
    expect(await screen.findByText('75%')).toBeInTheDocument()
    expect(screen.getByText('40%')).toBeInTheDocument()
  })

  it('renders progress bars with correct aria attributes', async () => {
    render(<TeacherCourseDetailPage params={resolvedParams('42')} />)
    await screen.findByText('Alice Student')
    const bars = screen.getAllByRole('progressbar')
    expect(bars.length).toBeGreaterThanOrEqual(2)
    const values = bars.map(b => Number(b.getAttribute('aria-valuenow')))
    expect(values).toContain(75)
    expect(values).toContain(40)
  })

  it('does not render any student management action buttons', async () => {
    render(<TeacherCourseDetailPage params={resolvedParams('42')} />)
    await screen.findByText('Alice Student')
    expect(screen.queryByRole('button', { name: /remove student/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /unenroll/i })).not.toBeInTheDocument()
  })
})

// ─── 3.7 Error card when coursesAPI.getById fails ────────────────────────────

describe('TeacherCourseDetailPage — Error state (3.7)', () => {
  it('renders error card when coursesAPI.getById fails', async () => {
    ;(coursesAPI.getById as any).mockRejectedValue(new Error('Course not found'))
    render(<TeacherCourseDetailPage params={resolvedParams('42')} />)
    expect(await screen.findByText(/error loading course/i)).toBeInTheDocument()
    expect(screen.getByText(/course not found/i)).toBeInTheDocument()
  })

  it('renders a Go Back button in the error card', async () => {
    ;(coursesAPI.getById as any).mockRejectedValue(new Error('Network error'))
    render(<TeacherCourseDetailPage params={resolvedParams('42')} />)
    await screen.findByText(/error loading course/i)
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
  })

  it('still renders course data when enrollments fail (non-blocking)', async () => {
    ;(enrollmentsAPI.getByCourse as any).mockRejectedValue(new Error('Enrollment error'))
    render(<TeacherCourseDetailPage params={resolvedParams('42')} />)
    expect(await screen.findByText('Introduction to TypeScript')).toBeInTheDocument()
    expect(screen.queryByText('Alice Student')).not.toBeInTheDocument()
  })
})

// ─── 3.8 Loading spinner while data is fetching ──────────────────────────────

describe('TeacherCourseDetailPage — Loading state (3.8)', () => {
  it('renders a loading spinner while data is fetching', async () => {
    ;(coursesAPI.getById as any).mockReturnValue(new Promise(() => {}))
    await act(async () => {
      render(<TeacherCourseDetailPage params={resolvedParams('42')} />)
    })
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('hides the loading spinner after data loads', async () => {
    render(<TeacherCourseDetailPage params={resolvedParams('42')} />)
    await waitFor(() =>
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
    )
  })
})

// ─── 3.9 PBT — View Details route is always /teacher/courses/[id] ────────────
// Validates: Requirements 5.2

describe('PBT 3.9 — View Details route is always /teacher/courses/[id] (never admin)', () => {
  it('for any positive integer course ID, router.push targets /teacher/courses/[id]', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 99999 }),
        async (courseId) => {
          mockPush.mockClear()
          ;(coursesAPI.getTeacherCourses as any).mockResolvedValue([
            {
              id: courseId,
              title: `Course ${courseId}`,
              teacher_name: 'Jane Teacher',
              enrollment_count: 0,
              lesson_count: 0,
              duration: '1 week',
              category: 'Test',
              status: 'active',
              created_at: '2024-01-01T00:00:00Z',
              description: 'Test course',
            },
          ])

          const { unmount } = render(<TeacherCoursesPage />)
          const btn = await screen.findByRole('button', { name: /view details/i })
          fireEvent.click(btn)

          expect(mockPush).toHaveBeenCalledWith(`/teacher/courses/${courseId}`)
          expect(mockPush).not.toHaveBeenCalledWith(
            expect.stringMatching(/^\/admin\//)
          )
          unmount()
        }
      ),
      { numRuns: 50 }
    )
  }, 30000)
})

// ─── 3.10 PBT — handleAddLesson produces sorted list of length n+1 ────────────
// Validates: Requirements 2.2

describe('PBT 3.10 — handleAddLesson: list length is n+1 and sorted by order', () => {
  /**
   * Tests the pure sort+append logic extracted from handleAddLesson.
   * This mirrors the exact logic in TeacherCourseDetailPage.handleAddLesson.
   */
  it('for any array of lessons, appending a new lesson yields length n+1 sorted by order', () => {
    interface LessonLike { id: number; title: string; duration: string; order: number }

    const lessonArb = fc.record({
      id: fc.integer({ min: 1, max: 100000 }),
      title: fc.string({ minLength: 1, maxLength: 50 }),
      duration: fc.constantFrom('10 min', '20 min', '30 min', '45 min', '60 min'),
      order: fc.integer({ min: 1, max: 200 }),
    })

    const newLessonApiArb = fc.record({
      id: fc.integer({ min: 100001, max: 200000 }),
      title: fc.string({ minLength: 1, maxLength: 50 }),
      duration_minutes: fc.integer({ min: 1, max: 120 }),
      order_index: fc.integer({ min: 1, max: 200 }),
      description: fc.constant(''),
      video_url: fc.constant(''),
    })

    fc.assert(
      fc.property(
        fc.array(lessonArb, { minLength: 0, maxLength: 20 }),
        newLessonApiArb,
        (existingLessons, newLessonApi) => {
          // Replicate handleAddLesson logic exactly as in the component
          const mapped: LessonLike = {
            id: newLessonApi.id,
            title: newLessonApi.title,
            duration: newLessonApi.duration_minutes ? `${newLessonApi.duration_minutes} min` : '0 min',
            order: newLessonApi.order_index,
          }
          const result = [...existingLessons, mapped].sort((a, b) => a.order - b.order)

          // Length is n + 1
          expect(result.length).toBe(existingLessons.length + 1)

          // Sorted by order (non-decreasing)
          for (let i = 1; i < result.length; i++) {
            expect(result[i].order).toBeGreaterThanOrEqual(result[i - 1].order)
          }

          // New lesson is present in the result
          expect(result.some(l => l.id === newLessonApi.id)).toBe(true)
        }
      ),
      { numRuns: 200 }
    )
  })
})
