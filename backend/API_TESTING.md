# API Testing Guide

Quick guide to test the E-Learning API endpoints.

## Setup

1. Start the server:
```bash
npm run dev
```

2. Use a tool like Postman, Insomnia, or curl to test endpoints.

## Test Flow

### 1. Admin Login

```bash
POST http://localhost:5000/api/auth/login/admin
Content-Type: application/json

{
  "email": "admin@eduaccess.com",
  "password": "admin123"
}
```

Response:
```json
{
  "user": { "id": 1, "email": "admin@eduaccess.com", "role": "admin" },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Save the token for subsequent requests.

### 2. Student Signup

```bash
POST http://localhost:5000/api/auth/signup/student
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "password123",
  "fullName": "John Doe",
  "schoolId": "BDU12345",
  "disabilityType": "Visual Impairment"
}
```

Response:
```json
{
  "message": "Student registration successful. Awaiting admin approval.",
  "user": { "id": 2, "email": "student@example.com", "approval_status": "pending" }
}
```

### 3. Approve Student (Admin)

```bash
POST http://localhost:5000/api/approvals/2/approve
Authorization: Bearer <admin_token>
```

Response:
```json
{
  "message": "Student approved successfully",
  "user": { "id": 2, "approval_status": "approved" }
}
```

### 4. Student Login

```bash
POST http://localhost:5000/api/auth/login/student
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "password123"
}
```

### 5. Teacher Signup

```bash
POST http://localhost:5000/api/auth/signup/teacher
Content-Type: application/json

{
  "email": "eduteacher@example.com",
  "password": "password123",
  "fullName": "Jane Smith",
  "department": "Computer Science",
  "bio": "Experienced educator"
}
```

### 6. Create Course (Teacher)

```bash
POST http://localhost:5000/api/courses
Authorization: Bearer <teacher_token>
Content-Type: application/json

{
  "title": "Introduction to Web Development",
  "description": "Learn HTML, CSS, and JavaScript basics",
  "category": "Programming",
  "difficultyLevel": "beginner"
}
```

### 7. Create Lesson (Teacher)

```bash
POST http://localhost:5000/api/lessons
Authorization: Bearer <teacher_token>
Content-Type: application/json

{
  "courseId": 1,
  "title": "HTML Basics",
  "description": "Learn HTML fundamentals",
  "content": "HTML is the standard markup language...",
  "videoUrl": "https://example.com/video.mp4",
  "orderIndex": 1,
  "durationMinutes": 30
}
```

### 8. Publish Course (Teacher)

```bash
PUT http://localhost:5000/api/courses/1
Authorization: Bearer <teacher_token>
Content-Type: application/json

{
  "status": "published"
}
```

### 9. Enroll in Course (Student)

```bash
POST http://localhost:5000/api/enrollments
Authorization: Bearer <student_token>
Content-Type: application/json

{
  "courseId": 1
}
```

### 10. Mark Lesson Complete (Student)

```bash
POST http://localhost:5000/api/progress/lesson/1/complete
Authorization: Bearer <student_token>
Content-Type: application/json

{
  "timeSpent": 25
}
```

### 11. Submit Feedback (Student)

```bash
POST http://localhost:5000/api/feedback
Authorization: Bearer <student_token>
Content-Type: application/json

{
  "category": "Course Content",
  "subject": "Great course!",
  "message": "I really enjoyed the HTML basics lesson.",
  "priority": "low"
}
```

### 12. View Feedback (Admin)

```bash
GET http://localhost:5000/api/feedback
Authorization: Bearer <admin_token>
```

### 13. View Audit Logs (Admin)

```bash
GET http://localhost:5000/api/audit?limit=50
Authorization: Bearer <admin_token>
```

## Common Test Scenarios

### Test Student Approval Workflow

1. Student signs up → status: pending
2. Student tries to login → error: "Account pending approval"
3. Admin approves student
4. Student logs in successfully

### Test School ID Validation

```bash
POST http://localhost:5000/api/auth/signup/student
{
  "schoolId": "ABC12345"  // Should fail - must start with BDU
}
```

### Test Teacher Email Validation

```bash
POST http://localhost:5000/api/auth/signup/teacher
{
  "email": "teacher@example.com"  // Should fail - must start with edu
}
```

### Test Course Access Control

1. Teacher creates course
2. Different teacher tries to edit → error: "Access denied"
3. Admin can edit any course

### Test Student Course Access

1. Student tries to view draft course → error: "Course not available"
2. Teacher publishes course
3. Student can now view and enroll

## Error Testing

### Invalid Credentials
```bash
POST http://localhost:5000/api/auth/login/student
{
  "email": "wrong@example.com",
  "password": "wrongpass"
}
# Expected: 401 Unauthorized
```

### Missing Token
```bash
GET http://localhost:5000/api/courses
# No Authorization header
# Expected: 401 "Access token required"
```

### Insufficient Permissions
```bash
GET http://localhost:5000/api/audit
Authorization: Bearer <student_token>
# Expected: 403 "Access denied. Insufficient permissions."
```

## Postman Collection

You can import this collection structure into Postman:

1. Create environment variables:
   - `base_url`: http://localhost:5000
   - `admin_token`: (set after admin login)
   - `teacher_token`: (set after teacher login)
   - `student_token`: (set after student login)

2. Use `{{base_url}}` and `{{admin_token}}` in requests

3. Set up test scripts to automatically save tokens:
```javascript
// In login request Tests tab
pm.environment.set("admin_token", pm.response.json().token);
```

## Database Verification

Check data directly in PostgreSQL:

```sql
-- View all users
SELECT id, email, role, approval_status FROM users;

-- View courses with enrollment count
SELECT c.*, COUNT(e.id) as enrollments 
FROM courses c 
LEFT JOIN course_enrollments e ON c.id = e.course_id 
GROUP BY c.id;

-- View student progress
SELECT u.full_name, c.title, ce.progress_percentage 
FROM course_enrollments ce
JOIN users u ON ce.student_id = u.id
JOIN courses c ON ce.course_id = c.id;

-- View audit logs
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;
```