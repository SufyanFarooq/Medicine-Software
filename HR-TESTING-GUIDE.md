# HR Module Testing Guide

## 🎯 Complete HR Module Flow Testing

### 📋 Prerequisites
1. **Login** to the system with appropriate role (admin/manager/staff)
2. **Navigate** to HR sections from sidebar menu
3. **Ensure** database is connected and running

---

## 👥 1. Employee Management Testing

### **URL**: `http://localhost:3000/hr/employees`

#### **Test Cases:**

**A. View Employees List**
- ✅ Navigate to `/hr/employees`
- ✅ Check if employee list loads
- ✅ Verify search functionality
- ✅ Test pagination
- ✅ Check filters (department, status)

**B. Add New Employee**
- ✅ Click "Add Employee" button
- ✅ Fill required fields:
  - Employee Code (unique)
  - First Name, Last Name
  - CNIC/Passport
  - Date of Birth
  - Address, Email, Phone
  - Department, Designation
  - Branch ID
  - Joining Date
- ✅ Submit form
- ✅ Verify employee appears in list

**C. Edit Employee**
- ✅ Click "Edit" action on any employee
- ✅ Modify fields (name, department, etc.)
- ✅ Save changes
- ✅ Verify updates in list

**D. View Employee Details**
- ✅ Click "Show" action on any employee
- ✅ Verify all details display correctly
- ✅ Check if form is in read-only mode

**E. Delete Employee**
- ✅ Click "Delete" action
- ✅ Confirm deletion in popup
- ✅ Verify employee removed from list

---

## ⏰ 2. Attendance Management Testing

### **URL**: `http://localhost:3000/hr/attendance`

#### **Test Cases:**

**A. View Attendance Records**
- ✅ Navigate to `/hr/attendance`
- ✅ Check if attendance list loads
- ✅ Verify date picker functionality
- ✅ Test employee filter
- ✅ Check status indicators

**B. Add Attendance Record**
- ✅ Click "Add Attendance" button
- ✅ Fill required fields:
  - Employee (select from dropdown)
  - Date
  - Check-in Time
  - Check-out Time (optional)
  - Notes
- ✅ Submit form
- ✅ Verify record appears in list

**C. Edit Attendance**
- ✅ Click "Edit" on any attendance record
- ✅ Modify check-in/check-out times
- ✅ Save changes
- ✅ Verify updates

**D. View Attendance Details**
- ✅ Click "Show" on any record
- ✅ Verify all details display
- ✅ Check work duration calculation

---

## 🏖️ 3. Leave Management Testing

### **URL**: `http://localhost:3000/hr/leaves`

#### **Test Cases:**

**A. View Leave Requests**
- ✅ Navigate to `/hr/leaves`
- ✅ Check if leave list loads
- ✅ Verify status filters (pending, approved, rejected)
- ✅ Test date range filters
- ✅ Check leave type filters

**B. Add Leave Request**
- ✅ Click "Add Leave" button
- ✅ Fill required fields:
  - Employee (select from dropdown)
  - Leave Type (sick, vacation, personal)
  - Start Date
  - End Date
  - Reason
- ✅ Submit form
- ✅ Verify request appears in list

**C. Approve/Reject Leave**
- ✅ Click "Approve" on pending leave
- ✅ Add approval notes
- ✅ Confirm approval
- ✅ Verify status changes to "Approved"

- ✅ Click "Reject" on pending leave
- ✅ Add rejection reason
- ✅ Confirm rejection
- ✅ Verify status changes to "Rejected"

**D. View Leave Details**
- ✅ Click "Show" on any leave request
- ✅ Verify all details display
- ✅ Check duration calculation

---

## 💰 4. Payroll Management Testing

### **URL**: `http://localhost:3000/hr/payroll`

#### **Test Cases:**

**A. View Payroll Runs**
- ✅ Navigate to `/hr/payroll`
- ✅ Check if payroll list loads
- ✅ Verify period filters
- ✅ Test employee filters
- ✅ Check payment status

**B. Create Payroll Profile**
- ✅ Click "Add Profile" button
- ✅ Fill required fields:
  - Employee (select from dropdown)
  - Base Salary
  - Allowances (housing, transport, etc.)
  - Deductions (tax, insurance, etc.)
  - Bank Details
- ✅ Submit form
- ✅ Verify profile appears in list

**C. Run Payroll**
- ✅ Click "Run Payroll" button
- ✅ Fill required fields:
  - Period (YYYY-MM format)
  - Employee IDs (array)
  - Overtime Rate
- ✅ Submit form
- ✅ Verify payroll runs are generated
- ✅ Check calculations are correct

**D. View Payroll Details**
- ✅ Click "Show" on any payroll run
- ✅ Verify earnings, deductions, net pay
- ✅ Check payment status

---

## 🔐 5. Permission Testing

### **Test Different User Roles:**

**A. Admin Role**
- ✅ Should see all HR sections
- ✅ Can perform all CRUD operations
- ✅ Can approve/reject leaves
- ✅ Can run payroll

**B. Manager Role**
- ✅ Should see all HR sections
- ✅ Can perform most operations
- ✅ Can approve/reject leaves
- ✅ Can run payroll

**C. Staff Role**
- ✅ Should see limited HR sections
- ✅ Can view own records
- ✅ Can request leaves
- ✅ Cannot approve/reject leaves

---

## 🐛 6. Error Testing

### **Test Error Scenarios:**

**A. Form Validation**
- ✅ Submit empty forms
- ✅ Enter invalid data
- ✅ Test required field validation
- ✅ Check date validations

**B. Duplicate Data**
- ✅ Try to add employee with existing code
- ✅ Try to add duplicate attendance for same date
- ✅ Test unique constraints

**C. Network Issues**
- ✅ Test with slow network
- ✅ Test API timeout scenarios
- ✅ Check error messages

---

## 📊 7. Data Flow Testing

### **Complete End-to-End Flow:**

**A. Employee Lifecycle**
1. ✅ Add new employee
2. ✅ Record attendance for employee
3. ✅ Create leave request for employee
4. ✅ Set up payroll profile for employee
5. ✅ Run payroll for employee
6. ✅ Update employee details
7. ✅ Deactivate employee

**B. Leave Workflow**
1. ✅ Employee requests leave
2. ✅ Manager reviews request
3. ✅ Manager approves/rejects
4. ✅ Employee sees updated status
5. ✅ Attendance reflects leave days

**C. Payroll Workflow**
1. ✅ Set up employee payroll profile
2. ✅ Record attendance for period
3. ✅ Run payroll for period
4. ✅ Verify calculations
5. ✅ Mark payroll as paid

---

## 🎨 8. UI/UX Testing

### **Interface Testing:**

**A. Responsive Design**
- ✅ Test on different screen sizes
- ✅ Check mobile compatibility
- ✅ Verify table responsiveness

**B. Navigation**
- ✅ Test sidebar navigation
- ✅ Check breadcrumbs
- ✅ Verify back/forward buttons

**C. User Experience**
- ✅ Check loading states
- ✅ Test form interactions
- ✅ Verify success/error messages
- ✅ Test keyboard navigation

---

## 🚀 9. Performance Testing

### **Load Testing:**

**A. Data Volume**
- ✅ Test with large employee lists
- ✅ Check pagination performance
- ✅ Test search with many records

**B. Concurrent Users**
- ✅ Test multiple users accessing HR
- ✅ Check for data conflicts
- ✅ Verify session management

---

## ✅ 10. Final Checklist

### **Complete System Verification:**

- [ ] All HR pages load without errors
- [ ] All CRUD operations work correctly
- [ ] Date pickers and time pickers function properly
- [ ] Search and filter functionality works
- [ ] Pagination works correctly
- [ ] Form validations are working
- [ ] Error messages are user-friendly
- [ ] Success messages appear after operations
- [ ] Navigation between pages is smooth
- [ ] Responsive design works on all devices
- [ ] Permission system is working correctly
- [ ] Data persistence is working
- [ ] No console errors in browser
- [ ] All API endpoints are responding

---

## 🎯 Quick Test Commands

```bash
# Test all HR pages
curl -s http://localhost:3000/hr/employees | head -5
curl -s http://localhost:3000/hr/attendance | head -5
curl -s http://localhost:3000/hr/leaves | head -5
curl -s http://localhost:3000/hr/payroll | head -5

# Check if all pages load successfully
echo "All HR pages should load without errors"
```

---

## 📝 Notes

1. **Database**: Ensure MongoDB is running and connected
2. **Authentication**: Login with appropriate user role
3. **Data**: Create sample data for testing
4. **Browser**: Use Chrome/Firefox for best compatibility
5. **Network**: Test on different network conditions

---

## 🆘 Troubleshooting

### **Common Issues:**

1. **Pages not loading**: Check import paths and server logs
2. **Forms not submitting**: Check API endpoints and validation
3. **Date pickers not working**: Verify dayjs integration
4. **Permission errors**: Check user role and permissions
5. **Data not saving**: Check database connection and API responses

---

**Happy Testing! 🎉**
