# E-Learning System for Accessibility

A comprehensive e-learning platform designed for students with disabilities, featuring role-based access control, course management, progress tracking, and accessibility features.

## Features

### User Roles
- **Students**: Browse courses, enroll, track progress, take quizzes, submit feedback
- **Teachers**: Create and manage courses, upload content, track student progress
- **Admins**: Manage users, approve student registrations, view system analytics, handle feedback

### Key Functionality
- Student approval workflow with school ID validation (BDU prefix)
- Teacher verification with educational email validation (edu prefix)
- Course and lesson management with video support
- Progress tracking and completion certificates
- Quiz system with automatic grading
- Feedback system with priority levels
- Comprehensive audit logging
- Keyboard shortcuts for accessibility (Alt+key combinations)

## Tech Stack

### Frontend
- Next.js 14 (React framework)
- TypeScript
- Tailwind CSS
- Shadcn/ui components
- React hooks for state management

### Backend
- Node.js with Express
- PostgreSQL database
- JWT authentication
- bcrypt password hashing
- express-validator for input validation

## Project Structure

```
├── frontend/          # Next.js frontend application
│   ├── app/          # Next.js app router pages
│   ├── components/   # Reusable React components
│   ├── hooks/        # Custom React hooks
│   └── lib/          # Utility functions
│
├── backend/          # Express backend API
│   ├── routes/       # API route handlers
│   ├── middleware/   # Authentication & validation
│   ├── db/           # Database connection
│   ├── schema.sql    # Database schema
│   └── server.js     # Express server
│
└── docs/             # Documentation files
```

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Backend Setup

1. Install PostgreSQL and create database:
```bash
# See BACKEND_SETUP_GUIDE.md for detailed instructions
createdb e_learning_db
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Configure environment variables (already set in `.env`):
```env
DB_HOST=localhost
DB_NAME=e_learning_db
DB_USER=eduaccess_user
DB_PASSWORD=postgresql
JWT_SECRET=your_jwt_secret_key
```

4. Initialize database:
```bash
npm run setup-db
```

5. Start backend server:
```bash
npm run dev
```

Backend runs on `HTTPStp://localhost:5000`

### Frontend Setup

1. Install frontend dependencies:
```bash
cd frontend
npm install
```

2. Start development server:
```bash
npm run dev
```

Frontend runs on `http://localhost:3000`

## Default Credentials

After running `npm run setup-db`, a default admin account is created:
- Email: `admin@eduaccess.com`
- Password: `admin123`

## API Documentation

See `backend/README.md` for complete API documentation.

### Key Endpoints
- `POST /api/auth/signup/student` - Student registration
- `POST /api/auth/signup/teacher` - Teacher registration
- `POST /api/auth/login/{role}` - Login by role
- `GET /api/courses` - List courses
- `POST /api/enrollments` - Enroll in course
- `POST /api/progress/lesson/:id/complete` - Mark lesson complete
- `POST /api/feedback` - Submit feedback

## Keyboard Shortcuts

The application includes keyboard shortcuts for improved accessibility:

### Student Shortcuts
- `Alt+D` - Dashboard
- `Alt+C` - Courses
- `Alt+P` - Progress
- `Alt+Q` - Quiz
- `Alt+F` - Profile

### Teacher Shortcuts
- `Alt+D` - Dashboard
- `Alt+C` - Courses
- `Alt+U` - Upload
- `Alt+P` - Profile
- `Alt+A` - Accessibility

### Admin Shortcuts
- `Alt+D` - Dashboard
- `Alt+U` - Users
- `Alt+C` - Courses
- `Alt+A` - Approvals
- `Alt+F` - Feedback
- `Alt+S` - System/Audit

## Validation Rules

### Student Registration
- Email must be valid format
- Password minimum 6 characters
- School ID must start with "BDU"
- Disability type required
- Account requires admin approval before access

### Teacher Registration
- Email must start with "edu"
- Password minimum 6 characters
- Department required
- Account active immediately after registration

## Database Schema

11 main tables:
- users (students, teachers, admins)
- courses
- lessons
- course_enrollments
- lesson_progress
- quizzes, quiz_questions, quiz_options
- quiz_attempts
- feedback
- audit_logs

See `backend/schema.sql` for complete schema.

## Testing

### Backend Testing
See `backend/API_TESTING.md` for API testing guide with curl examples.

### Frontend Testing
```bash
cd frontend
npm run build  # Test production build
npm run lint   # Run linter
```

## Documentation

- `BACKEND_SETUP_GUIDE.md` - Step-by-step backend setup
- `backend/README.md` - Complete API documentation
- `backend/API_TESTING.md` - API testing examples
- `backend/IMPLEMENTATION_SUMMARY.md` - Implementation details
- `KEYBOARD_SHORTCUTS_COMPLETE.md` - Keyboard shortcuts guide

## Security Features

- JWT-based authentication with token expiration
- Password hashing with bcrypt (10 rounds)
- Role-based access control (RBAC)
- SQL injection prevention (parameterized queries)
- Input validation on all endpoints
- CORS configuration
- Audit logging for sensitive operations

## Development

### Backend Development
```bash
cd backend
npm run dev  # Starts with nodemon for auto-reload
```

### Frontend Development
```bash
cd frontend
npm run dev  # Starts Next.js dev server
```

### Database Reset
```bash
cd backend
npm run setup-db  # Drops and recreates all tables
```

## Production Deployment

1. Set strong JWT_SECRET in production
2. Use environment variables for all credentials
3. Enable HTTPS
4. Configure proper CORS origins
5. Set up database backups
6. Use process manager (PM2) for Node.js
7. Set up monitoring and logging
8. Enable PostgreSQL SSL connections

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license here]

## Support

For issues and questions:
- Check documentation in `/backend` and root directory
- Review API testing guide
- Check database schema

## Acknowledgments

Built with accessibility in mind to support students with disabilities in their educational journey.
# e-learning
