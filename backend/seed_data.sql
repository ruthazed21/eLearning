-- Finalized Seeding for E-Learning Platform

-- Clear existing data (optional, but good for clean run)
TRUNCATE TABLE quiz_attempts, quiz_options, quiz_questions, quizzes, lesson_progress, course_enrollments, lessons, courses CASCADE;

-- 1. Create a Teacher User (Password: teacher123)
INSERT INTO users (email, password_hash, role, full_name, department, bio, approval_status)
VALUES 
('teacher@eduaccess.com', '$2a$10$pjgoA/y9JRV87rYM3QTdSe3YBGYYw12D9kvi291pWVMiJBs7hmPSq', 'teacher', 'Dr. Sarah Smith', 'Computer Science', 'Expert in Web Development and Accessibility.', 'approved')
ON CONFLICT (email) DO NOTHING;

-- 2. Create Sample Courses
INSERT INTO courses (title, description, teacher_id, category, difficulty_level, status)
VALUES 
('Introduction to Web Accessibility', 'Learn the basics of creating accessible websites for all users.', (SELECT id FROM users WHERE email = 'teacher@eduaccess.com'), 'Web Development', 'beginner', 'published'),
('Advanced Javascript Patterns', 'Deep dive into complex JS concepts and architectural patterns.', (SELECT id FROM users WHERE email = 'teacher@eduaccess.com'), 'Programming', 'advanced', 'published'),
('Inclusive Design Principles', 'Master the art of design that excludes no one.', (SELECT id FROM users WHERE email = 'teacher@eduaccess.com'), 'Design', 'intermediate', 'published'),
('Screen Reader Optimization', 'How to optimize your apps for screen reader users.', (SELECT id FROM users WHERE email = 'teacher@eduaccess.com'), 'Accessibility', 'intermediate', 'published');

-- 3. Create Sample Lessons for the first course
INSERT INTO lessons (course_id, title, content, video_url, subtitle_url, order_index)
VALUES 
((SELECT id FROM courses WHERE title = 'Introduction to Web Accessibility'), 'What is WCAG?', 'WCAG stands for Web Content Accessibility Guidelines...', '/uploads/videos/video-1773812195075-374439595.mp4', '/uploads/subtitles/subtitle-1773812214583-160534304.vtt', 0),
((SELECT id FROM courses WHERE title = 'Introduction to Web Accessibility'), 'Semantic HTML', 'Using the right HTML elements for the right job...', 'https://www.youtube.com/watch?v=91W9As-6V3A', NULL, 1),
((SELECT id FROM courses WHERE title = 'Introduction to Web Accessibility'), 'ARIA Labels and Roles', 'When HTML is not enough, use ARIA...', 'https://www.youtube.com/watch?v=g9Q6SjdvXvE', NULL, 2)
ON CONFLICT DO NOTHING;

-- 4. Create a Sample Quiz
INSERT INTO quizzes (course_id, title, description, time_limit_minutes, passing_score)
VALUES 
((SELECT id FROM courses WHERE title = 'Introduction to Web Accessibility'), 'Web Accessibility Basics Quiz', 'Test your knowledge on basic accessibility principles.', 15, 70);

-- 5. Create Quiz Questions with order_index
INSERT INTO quiz_questions (quiz_id, question_text, question_type, order_index)
VALUES 
((SELECT id FROM quizzes WHERE title = 'Web Accessibility Basics Quiz'), 'What does WCAG stand for?', 'multiple_choice', 0),
((SELECT id FROM quizzes WHERE title = 'Web Accessibility Basics Quiz'), 'Which HTML tag is most appropriate for a main heading?', 'multiple_choice', 1);

-- 6. Create Quiz Options with order_index
INSERT INTO quiz_options (question_id, option_text, is_correct, order_index)
VALUES 
((SELECT id FROM quiz_questions WHERE question_text = 'What does WCAG stand for?'), 'Web Content Accessibility Guidelines', true, 0),
((SELECT id FROM quiz_questions WHERE question_text = 'What does WCAG stand for?'), 'World Computer Association Group', false, 1),
((SELECT id FROM quiz_questions WHERE question_text = 'Which HTML tag is most appropriate for a main heading?'), 'h1', true, 0),
((SELECT id FROM quiz_questions WHERE question_text = 'Which HTML tag is most appropriate for a main heading?'), 'div', false, 1);
