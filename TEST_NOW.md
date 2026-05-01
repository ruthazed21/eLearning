# Test the Integration NOW!

## 🚀 Quick Start (5 Minutes)

### Step 1: Start Backend (Terminal 1)
```bash
cd backend
npm install  # If not done already
npm run setup-db  # If not done already
npm run dev
```

**Expected output:**
```
Connected to PostgreSQL database
Server running on port 5000
```

### Step 2: Start Frontend (Terminal 2)
```bash
cd frontend
npm install  # If not done already
npm run dev
```

**Expected output:**
```
Ready on http://localhost:3000
```

## ✅ Test Complete Workflow (10 Minutes)

### Test 1: Student Registration & Approval

1. **Open browser:** http://localhost:3000

2. **Sign up as student:**
   - Click "Sign up here"
   - Fill form:
     - Name: Test Studentt
     - Email: student@test.com
     - School ID: BDU12345 (must start with BDU!)
     - Password: test123
     - Confirm Password: test123
     - Disability Type: Select one
   - Click "Create Account"
   - Should redirect to pending approval page

3. **Login as admin:**
   - Go to http://localhost:3000/auth/admin-login
   - Email: admin@eduaccess.com
   - Password: admin123
   - Click "Login as Administrator"
   - Should redirect to admin dashboard

4. **Approve student:**
   - Click "Approvals" in sidebar (or press Alt+A)
   - See the pending student
   - Click green checkmark to approve
   - Student should disappear from list

5. **Login as student:**
   - Logout (click profile icon → Logout)
   - Go to http://localhost:3000/auth/login
   - Email: student@test.com
   - Password: test123
   - Click "Login"
   - Should redirect to student dashboard ✅

### Test 2: Teacher Registration

1. **Sign up as teacher:**
   - Go to http://localhost:3000/auth/teacher-signup
   - Fill form:
     - Name: Test Teacher
     - Email: eduteacher@test.com (must start with edu!)
     - Department: Computer Science
     - Password: test123
     - Confirm Password: test123
   - Click "Create Account"
   - Should auto-login and redirect to teacher dashboard ✅

### Test 3: Admin Access

1. **Login as admin:**
   - Go to http://localhost:3000/auth/admin-login
   - Email: admin@eduaccess.com
   - Password: admin123
   - Should access admin dashboard ✅

2. **Test approvals page:**
   - Click "Approvals" or press Alt+A
   - Should see pending students (if any)
   - Can approve/reject ✅

## 🧪 Verify Everything Works

### Check Authentication
- [ ] Student can signup
- [ ] Student sees pending page
- [ ] Admin can login
- [ ] Admin can approve student
- [ ] Approved student can login
- [ ] Teacher can signup and auto-login
- [ ] Logout works for all roles

### Check Route Protection
- [ ] Try accessing /admin/dashboard without login → redirects
- [ ] Try accessing /teacher/dashboard without login → redirects
- [ ] Try accessing /student/dashboard without login → redirects
- [ ] Student cannot access admin pages
- [ ] Teacher cannot access admin pages

### Check API Integration
- [ ] Admin approvals page loads data from API
- [ ] Approve button works
- [ ] Reject button works
- [ ] Loading states appear
- [ ] Errors are handled

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# If not running
sudo systemctl start postgresql

# Recreate database
dropdb e_learning_db
createdb e_learning_db
cd backend && npm run setup-db
```

### Frontend won't start
```bash
cd frontend
rm -rf .next node_modules
npm install
npm run dev
```

### "Cannot connect to backend"
- Verify backend is running on port 5000
- Check `frontend/.env.local` has correct API URL
- Check browser console for CORS errors

### "Invalid token" or "Unauthorized"
- Logout and login again
- Clear browser localStorage
- Check JWT_SECRET in backend/.env

### School ID validation fails
- Must start with "BDU" (case-insensitive)
- Examples: BDU12345, bdu99999, BDU-001

### Teacher email validation fails
- Must start with "edu" (case-insensitive)
- Examples: eduteacher@test.com, edu.prof@university.com

## 📊 What to Check in Browser DevTools

### Console Tab
- No errors (red messages)
- API calls logging (if you added console.logs)

### Network Tab
- API calls to http://localhost:5000/api/*
- Status 200 for successful requests
- Status 401 for unauthorized (expected when not logged in)
- Check request/response data

### Application Tab → Local Storage
- Should see `token` and `user` after login
- Should be empty after logout

## 🎯 Success Criteria

You've successfully integrated when:
- ✅ All auth pages work
- ✅ Student approval workflow complete
- ✅ Route protection works
- ✅ API calls succeed
- ✅ Data loads from database
- ✅ No console errors
- ✅ Logout works

## 🎉 If Everything Works

Congratulations! You have:
1. ✅ Working backend API
2. ✅ Functional authentication
3. ✅ Admin approval workflow
4. ✅ Route protection
5. ✅ Real database integration

## 📝 Next Steps After Testing

1. **If tests pass:**
   - Continue integrating remaining pages
   - Follow `FINAL_INTEGRATION_STEPS.md`
   - Use admin approvals page as reference

2. **If tests fail:**
   - Check error messages
   - Review `INTEGRATION_TESTING_GUIDE.md`
   - Check backend logs
   - Verify database is set up

## 💡 Quick Tips

- Keep both terminals open (backend + frontend)
- Use browser DevTools Network tab to debug
- Check backend terminal for API logs
- Test one feature at a time
- Logout/login if auth issues occur

## 🚀 You're Ready!

Everything is set up and ready to test. The integration is working!

**Time to test: 10-15 minutes**
**Expected result: All workflows functional**

Go ahead and test now! 🎊