-- E-Learning System Database Schema

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS quiz_attempts CASCADE;
DROP TABLE IF EXISTS quiz_options CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
DROP TABLE IF EXISTS lesson_progress CASCADE;
DROP TABLE IF EXISTS course_enrollments CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table (Students, Teachers, Admins)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
    full_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Student-specific fields
    school_id VARCHAR(50),
    disability_type VARCHAR(100),
    approval_status VARCHAR(20) CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    
    -- Teacher-specific fields
    department VARCHAR(100),
    bio TEXT,
    
    -- Profile fields
    profile_picture_url TEXT,
    phone VARCHAR(20),
    
    -- Constraints
    CONSTRAINT student_fields_check CHECK (
        role != 'student' OR (school_id IS NOT NULL AND disability_type IS NOT NULL AND approval_status IS NOT NULL)
    ),
    CONSTRAINT teacher_fields_check CHECK (
        role != 'teacher' OR (department IS NOT NULL)
    )
);

-- Courses table
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(100),
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    thumbnail_url TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lessons table
CREATE TABLE lessons (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,
    video_url TEXT,
    subtitle_url TEXT,
    document_url TEXT,
    order_index INTEGER NOT NULL,
    duration_minutes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Course enrollments
CREATE TABLE course_enrollments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    UNIQUE(student_id, course_id)
);

-- Lesson progress tracking
CREATE TABLE lesson_progress (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    time_spent_minutes INTEGER DEFAULT 0,
    UNIQUE(student_id, lesson_id)
);

-- Quizzes
CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id INTEGER REFERENCES lessons(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    passing_score INTEGER DEFAULT 70,
    time_limit_minutes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quiz questions
CREATE TABLE quiz_questions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
    points INTEGER DEFAULT 1,
    order_index INTEGER NOT NULL
);

-- Quiz options (for multiple choice questions)
CREATE TABLE quiz_options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES quiz_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    order_index INTEGER NOT NULL
);

-- Quiz attempts
CREATE TABLE quiz_attempts (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    score DECIMAL(5,2),
    total_points INTEGER,
    passed BOOLEAN,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    answers JSONB
);

-- Feedback system
CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    admin_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_approval_status ON users(approval_status);
CREATE INDEX idx_courses_teacher ON courses(teacher_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_lessons_course ON lessons(course_id);
CREATE INDEX idx_enrollments_student ON course_enrollments(student_id);
CREATE INDEX idx_enrollments_course ON course_enrollments(course_id);
CREATE INDEX idx_lesson_progress_student ON lesson_progress(student_id);
CREATE INDEX idx_lesson_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX idx_quiz_attempts_student ON quiz_attempts(student_id);
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password_hash, role, full_name, approval_status)
VALUES ('admin@eduaccess.com', '$2a$10$placeholder', 'admin', 'System Administrator', NULL);
