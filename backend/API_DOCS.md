# E-Learning Platform — API Documentation

Base URL: `http://localhost:5000/api`

All endpoints (except `/health`, `/api/auth/login`, `/api/auth/signup`) require authentication via:
- **httpOnly cookie** (`token`) set on login, OR
- **Authorization header**: `Bearer <token>`

---

## Authentication

### POST /api/auth/login
Login with email and password.

**Request**
```json
{ "email": "user@example.com", "password": "secret" }
```
**Response 200**
```json
{ "token": "<jwt>", "user": { "id": 1, "email": "user@example.com", "role": "student", "full_name": "Alice" } }
```
Sets `token` httpOnly cookie (7 days).

**Errors**: `400` validation, `401` invalid credentials, `403` pending approval, `429` rate limit (5/15 min)

---

### POST /api/auth/signup
Register a new user (student or teacher).

**Request**
```json
{
  "email": "user@example.com",
  "password": "secret",
  "fullName": "Alice Smith",
  "role": "student",
  "schoolId": "S12345",
  "disabilityType": "visual"
}
```
**Response 201**
```json
{ "message": "Registration submitted. Awaiting admin approval.", "userId": 42 }
```

---

### POST /api/auth/logout
Clears the auth cookie.

**Response 200** `{ "message": "Logged out successfully" }`

---

## Users

### GET /api/users
Get all users. Admin only.

**Query params**: `role`, `search`, `page` (default 1), `limit` (default 50)

**Response 200**
```json
[{ "id": 1, "email": "...", "full_name": "...", "role": "student", "approval_status": "approved", "created_at": "..." }]
```

---

### GET /api/users/:id
Get user by ID. Admin or own profile.

**Response 200** — user object

---

### POST /api/users
Create user. Admin only.

**Request** — same shape as signup

**Response 201** — created user

---

### PUT /api/users/:id
Update user. Admin or own profile.

**Request** — partial user fields

**Response 200** — updated user

---

### DELETE /api/users/:id
Delete user. Admin only.

**Response 200** `{ "message": "User deleted" }`

---

## Courses

### GET /api/courses
Get courses.

**Query params**: `category`, `difficulty`, `teacherId`, `status`, `page`, `limit`

**Response 200** — array of course objects

---

### GET /api/courses/:id
Get course by ID with lesson count and enrollment count.

**Response 200** — course object

---

### POST /api/courses
Create course. Teacher or admin.

**Request**
```json
{ "title": "...", "description": "...", "category": "Math", "difficulty": "beginner", "status": "draft", "teacherId": 5 }
```
**Response 201** — created course

---

### PUT /api/courses/:id
Update course. Owner teacher or admin.

**Response 200** — updated course

---

### DELETE /api/courses/:id
Delete course. Owner teacher or admin.

**Response 200** `{ "message": "Course deleted" }`

---

## Lessons

### GET /api/lessons/course/:courseId
Get all lessons for a course.

**Response 200** — array of lesson objects

---

### GET /api/lessons/:id
Get lesson by ID.

**Response 200** — lesson object with `video_url` if video uploaded

---

### POST /api/lessons
Create lesson. Teacher or admin. Multipart form data.

**Form fields**: `courseId`, `title`, `description`, `content`, `orderIndex`, `durationMinutes`, `video` (file)

**Response 201** — created lesson

---

### PUT /api/lessons/:id
Update lesson. Multipart form data.

**Response 200** — updated lesson

---

### DELETE /api/lessons/:id
Delete lesson.

**Response 200** `{ "message": "Lesson deleted" }`

---

## Enrollments

### GET /api/enrollments/student/:studentId
Get enrollments for a student.

**Response 200** — array of enrollment objects with course details

---

### GET /api/enrollments/course/:courseId
Get enrollments for a course. Teacher or admin.

**Response 200** — array of enrollment objects with student details

---

### POST /api/enrollments
Enroll current student in a course.

**Request** `{ "courseId": 1 }`

**Response 201** — enrollment object

---

### DELETE /api/enrollments/:courseId
Unenroll from a course.

**Response 200** `{ "message": "Unenrolled successfully" }`

---

## Progress

### GET /api/progress/course/:courseId
Get student's progress for a course.

**Response 200** — array of progress records per lesson

---

### GET /api/progress/student/:studentId
Get all progress for a student.

**Response 200** — array of progress records

---

### POST /api/progress/lesson/:lessonId/complete
Mark a lesson as complete.

**Request** `{ "timeSpent": 300 }` (seconds, optional)

**Response 200** — updated progress record

---

## Quizzes

### GET /api/quizzes/available
Get quizzes available to the current student.

**Response 200** — array of quiz objects

---

### GET /api/quizzes/course/:courseId
Get quizzes for a course.

**Response 200** — array of quiz objects

---

### GET /api/quizzes/:id
Get quiz with questions (answers hidden for students).

**Response 200** — quiz object with questions array

---

### POST /api/quizzes/:id/attempt
Submit quiz answers.

**Request** `{ "answers": { "questionId": "selectedOption", ... } }`

**Response 200**
```json
{ "score": 80, "passed": true, "correctAnswers": 8, "totalQuestions": 10 }
```

---

### GET /api/quizzes/:id/attempts
Get previous attempts for a quiz.

**Response 200** — array of attempt objects

---

## Feedback

### GET /api/feedback
Get all feedback. Admin only.

**Query params**: `status`, `category`, `priority`

**Response 200** — array of feedback objects

---

### POST /api/feedback
Submit feedback.

**Request** `{ "subject": "...", "message": "...", "category": "bug", "priority": "high" }`

**Response 201** — created feedback

---

### PUT /api/feedback/:id/status
Update feedback status. Admin only.

**Request** `{ "status": "resolved", "adminResponse": "Fixed in v1.2" }`

**Response 200** — updated feedback

---

### DELETE /api/feedback/:id
Delete feedback. Admin only.

**Response 200** `{ "message": "Feedback deleted" }`

---

## Audit Logs

### GET /api/audit
Get audit logs. Admin only.

**Query params**: `userId`, `action`, `entityType`, `startDate`, `endDate`, `page`, `limit`

**Response 200** — array of audit log entries

---

### GET /api/audit/stats/summary
Get audit statistics. Admin only.

**Query params**: `startDate`, `endDate`

**Response 200**
```json
{ "totalActions": 500, "byAction": { "login": 200, "create": 100 }, "byEntityType": { "user": 150 } }
```

---

## System

### GET /api/system/stats
Get system-wide statistics. Admin only.

**Response 200**
```json
{ "totalUsers": 100, "totalCourses": 20, "activeStudents": 75, "userGrowth": 5 }
```

---

### GET /api/system/teacher/stats
Get teacher-specific statistics.

**Response 200** — teacher stats object

---

### GET /api/system/student/stats
Get student-specific statistics.

**Response 200** — student stats object

---

## Approvals

### GET /api/approvals/pending
Get pending approval requests. Admin only.

**Response 200** — array of pending users

---

### POST /api/approvals/:id/approve
Approve a user registration. Admin only.

**Response 200** `{ "message": "User approved" }`

---

### POST /api/approvals/:id/reject
Reject a user registration. Admin only.

**Request** `{ "reason": "..." }` (optional)

**Response 200** `{ "message": "User rejected" }`

---

## Health Check

### GET /health
Public endpoint. No auth required.

**Response 200** (healthy)
```json
{ "status": "healthy", "uptime": 3600.5, "version": "1.0.0", "timestamp": "2024-01-01T00:00:00.000Z" }
```

**Response 503** (unhealthy — DB unreachable)
```json
{ "status": "unhealthy", "timestamp": "2024-01-01T00:00:00.000Z" }
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Validation error — check `errors` array in response |
| 401 | Unauthenticated — missing or invalid token |
| 403 | Forbidden — insufficient role permissions |
| 404 | Resource not found |
| 409 | Conflict — e.g. already enrolled, email taken |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
| 503 | Service unavailable — health check failed |

**Error response shape**:
```json
{ "error": "Human-readable message" }
```
Validation errors:
```json
{ "errors": [{ "field": "email", "message": "Invalid email" }] }
```
