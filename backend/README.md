# E-Learning Backend API

PostgreSQL-based REST API for the E-Learning accessibility platform.

## Features

- JWT-based authentication
- Role-based access control (Student, Teacher, Admin)
- Student approval workflow with school ID validation
- Course and lesson management
- Progress tracking
- Quiz system
- Feedback system
- Audit logging

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=e_learning_db
DB_USER=eduaccess_user
DB_PASSWORD=your_password
PORT=5000
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=7d
```

3. Create PostgreSQL database and user:
```bash
# Login to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE e_learning_db;
CREATE USER eduaccess_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE e_learning_db TO eduaccess_user;
```

4. Setup database schema:
```bash
npm run setup-db
```

This will create all tables and a default admin user:
- Email: `admin@eduaccess.com`
- Password: `admin123`

## Running the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will run on `http://localhost:5000`

## API Endpoints

### Authentication

#### Student Signup
```
POST /api/auth/signup/student
Body: { email, password, fullName, schoolId, disabilityType }
Note: schoolId must start with "BDU"
```

#### Teacher Signup
```
POST /api/auth/signup/teacher
Body: { email, password, fullName, department, bio }
Note: email must start with "edu"
```

#### Student Login
```
POST /api/auth/login/student
Body: { email, password }
```

#### Teacher Login
```
POST /api/auth/login/teacher
Body: { email, password }
```

#### Admin Login
```
POST /api/auth/login/admin
Body: { email, password }
```

### Users (Admin only)

```
GET    /api/users              - Get all users
GET    /api/users/:id          - Get user by ID
POST   /api/users              - Create user
PUT    /api/users/:id          - Update user
DELETE /api/users/:id          - Delete user
```

### Approvals (Admin only)

```
GET    /api/approvals/pending       - Get pending student approvals
GET    /api/approvals               - Get all approvals (with status filter)
POST   /api/approvals/:id/approve   - Approve student
POST   /api/approvals/:id/reject    - Reject student
```

### Courses

```
GET    /api/courses            - Get all courses
GET    /api/courses/:id        - Get course by ID with lessons
POST   /api/courses            - Create course (Teacher/Admin)
PUT    /api/courses/:id        - Update course (Teacher/Admin)
DELETE /api/courses/:id        - Delete course (Teacher/Admin)
```

### Lessons

```
GET    /api/lessons/course/:courseId  - Get lessons for course
GET    /api/lessons/:id               - Get lesson by ID
POST   /api/lessons                   - Create lesson (Teacher/Admin)
PUT    /api/lessons/:id               - Update lesson (Teacher/Admin)
DELETE /api/lessons/:id               - Delete lesson (Teacher/Admin)
```

### Enrollments

```
GET    /api/enrollments/student/:studentId  - Get student enrollments
GET    /api/enrollments/course/:courseId    - Get course enrollments (Teacher/Admin)
POST   /api/enrollments                     - Enroll in course (Student)
DELETE /api/enrollments/:courseId           - Unenroll from course (Student)
```

### Progress (Student only)

```
GET    /api/progress/course/:courseId           - Get progress for course
GET    /api/progress/student/:studentId         - Get all student progress
POST   /api/progress/lesson/:lessonId/complete  - Mark lesson complete
POST   /api/progress/lesson/:lessonId/time      - Update time spent
```

### Quizzes

```
GET    /api/quizzes/course/:courseId  - Get quizzes for course
GET    /api/quizzes/:id               - Get quiz with questions
POST   /api/quizzes                   - Create quiz (Teacher/Admin)
POST   /api/quizzes/:id/attempt       - Submit quiz attempt (Student)
GET    /api/quizzes/:id/attempts      - Get student attempts (Student)
```

### Feedback

```
GET    /api/feedback                  - Get all feedback (Admin)
GET    /api/feedback/user/:userId     - Get user feedback
GET    /api/feedback/:id              - Get feedback by ID
POST   /api/feedback                  - Submit feedback
PUT    /api/feedback/:id/status       - Update feedback status (Admin)
DELETE /api/feedback/:id              - Delete feedback (Admin)
```

### Audit Logs (Admin only)

```
GET    /api/audit                - Get audit logs
GET    /api/audit/:id            - Get audit log by ID
GET    /api/audit/stats/summary  - Get audit statistics
```

## Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

The token is returned upon successful login/signup.

## Database Schema

The database consists of 11 main tables:

1. **users** - All users (students, teachers, admins)
2. **courses** - Course information
3. **lessons** - Lesson content
4. **course_enrollments** - Student course enrollments
5. **lesson_progress** - Student lesson progress
6. **quizzes** - Quiz information
7. **quiz_questions** - Quiz questions
8. **quiz_options** - Multiple choice options
9. **quiz_attempts** - Student quiz attempts
10. **feedback** - User feedback
11. **audit_logs** - System audit trail

## Validation Rules

### Student Registration
- Email must be valid
- Password minimum 6 characters
- School ID must start with "BDU"
- Disability type required
- Account requires admin approval

### Teacher Registration
- Email must start with "edu"
- Password minimum 6 characters
- Department required
- Account active immediately

### Course Management
- Only teachers can manage their own courses
- Admins can manage all courses
- Students can only view published courses

## Error Handling

All errors return JSON with an `error` field:

```json
{
  "error": "Error message"
}
```

HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad request
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 500: Server error

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Role-based access control
- SQL injection prevention with parameterized queries
- Input validation with express-validator
- CORS enabled

## Development

To reset the database:
```bash
npm run setup-db
```

To view logs:
```bash
npm run dev
```

## Production Deployment

1. Set strong JWT_SECRET in .env
2. Use environment variables for all sensitive data
3. Enable HTTPS
4. Set up database backups
5. Configure proper CORS origins
6. Use a process manager (PM2)
7. Set up monitoring and logging
