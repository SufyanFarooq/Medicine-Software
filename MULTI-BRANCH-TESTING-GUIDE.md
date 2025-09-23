# 🏢 Multi-Branch/Franchise System Testing Guide

## 🎯 System Overview

The multi-branch system allows:
- **HQ/Admin** users to create and manage branches
- **Franchise Owners** to manage their specific branch
- **Branch Managers** to oversee branch operations
- **Staff** to work within their assigned branch
- **Tenant scoping** - users only see data from their assigned branches

---

## 🏗️ System Architecture

### **Database Structure**
```
Branches Collection:
├── Head Office (HO-001)
├── Lahore Branch (BO-001) 
├── Islamabad Branch (BO-002)
├── Karachi Warehouse (WH-001)
└── Rawalpindi Retail Store (RS-001)

User Branch Memberships:
├── superadmin → All branches (Admin role)
├── Sufyan → Head Office (FranchiseOwner role)
└── Other users → Assigned branches (Staff/Manager roles)
```

### **Role Hierarchy**
1. **Admin** - Full access to all branches
2. **FranchiseOwner** - Full access to assigned branch
3. **BranchManager** - Management access to assigned branch
4. **Staff** - Limited access to assigned branch
5. **Viewer** - Read-only access to assigned branch

---

## 🧪 Testing Scenarios

### **1. Branch Management (HQ Users)**

#### **Test Case: Create New Branch**
- **URL**: `http://localhost:3000/branches`
- **Steps**:
  1. Login as superadmin
  2. Navigate to Branches page
  3. Click "Add Branch"
  4. Fill form:
     - Name: "Test Branch"
     - Code: "TB-001"
     - Type: "Branch Office"
     - Address: Complete address
     - Contact: Phone, email
     - Manager: Manager details
  5. Submit form
  6. Verify branch appears in list

#### **Test Case: Edit Branch**
- **Steps**:
  1. Click "Edit" on any branch
  2. Modify branch details
  3. Save changes
  4. Verify updates are reflected

#### **Test Case: Delete Branch**
- **Steps**:
  1. Click "Delete" on a branch
  2. Confirm deletion
  3. Verify branch is removed

---

### **2. User Branch Assignment**

#### **Test Case: Assign User to Branch**
- **URL**: `http://localhost:3000/api/branches/[branchId]/members`
- **Steps**:
  1. Login as admin
  2. Navigate to branch members
  3. Add user to branch with specific role
  4. Verify user can access branch

#### **Test Case: Role-Based Permissions**
- **Steps**:
  1. Login with different user roles
  2. Verify access levels:
     - **FranchiseOwner**: Full branch access
     - **BranchManager**: Management access
     - **Staff**: Limited access
     - **Viewer**: Read-only access

---

### **3. Branch Switching**

#### **Test Case: Multi-Branch User**
- **Steps**:
  1. Login as superadmin (has access to all branches)
  2. Verify branch switcher appears in topbar
  3. Switch between different branches
  4. Verify data changes based on selected branch

#### **Test Case: Single Branch User**
- **Steps**:
  1. Login as regular user (assigned to one branch)
  2. Verify no branch switcher appears
  3. Verify user only sees their branch data

---

### **4. Tenant Scoping**

#### **Test Case: Employee Management**
- **URL**: `http://localhost:3000/hr/employees`
- **Steps**:
  1. Login as different users
  2. Navigate to Employees page
  3. Verify only employees from assigned branch are shown
  4. Try to create new employee
  5. Verify employee is assigned to user's branch

#### **Test Case: Product Management**
- **URL**: `http://localhost:3000/products`
- **Steps**:
  1. Login as branch user
  2. Navigate to Products page
  3. Verify only products from assigned branch are shown
  4. Create new product
  5. Verify product is assigned to user's branch

#### **Test Case: Invoice Management**
- **URL**: `http://localhost:3000/invoices`
- **Steps**:
  1. Login as branch user
  2. Navigate to Invoices page
  3. Verify only invoices from assigned branch are shown
  4. Create new invoice
  5. Verify invoice is assigned to user's branch

---

### **5. Cross-Branch Data Isolation**

#### **Test Case: Data Leak Prevention**
- **Steps**:
  1. Login as Branch A user
  2. Try to access Branch B data via API
  3. Verify API returns only Branch A data
  4. Verify no Branch B data is visible

#### **Test Case: HQ User Access**
- **Steps**:
  1. Login as superadmin
  2. Verify can see all branches' data
  3. Switch between branches
  4. Verify aggregated reports work

---

## 🔧 API Testing

### **Branch APIs**
```bash
# Get all branches
GET /api/branches

# Create branch
POST /api/branches
{
  "name": "Test Branch",
  "code": "TB-001",
  "branchType": "branch_office",
  "address": {...},
  "contactInfo": {...}
}

# Update branch
PUT /api/branches/[id]
{
  "name": "Updated Branch Name"
}

# Delete branch
DELETE /api/branches/[id]
```

### **Branch Membership APIs**
```bash
# Get branch members
GET /api/branches/[branchId]/members

# Add user to branch
POST /api/branches/[branchId]/members
{
  "userId": "user_id",
  "role": "BranchManager",
  "notes": "Branch manager assignment"
}
```

### **Branch Switching API**
```bash
# Get user's accessible branches
GET /api/session/branch

# Switch to different branch
POST /api/session/branch
{
  "branchId": "branch_id"
}
```

---

## 🎨 UI Components Testing

### **Branch Switcher Component**
- **Location**: Topbar (center)
- **Features**:
  - Shows current branch
  - Dropdown with accessible branches
  - Role indicators
  - Branch type icons
  - Switching animation

### **Branch Management Page**
- **URL**: `http://localhost:3000/branches`
- **Features**:
  - Branch list with search/filter
  - Add/Edit/Delete operations
  - Branch details form
  - Member management

---

## 📊 Data Scoping Examples

### **Employee Scoping**
```javascript
// Branch user sees only their branch employees
const employees = await db.employees.find({
  branchId: userBranchId,
  isActive: true
});

// HQ user sees all employees
const employees = await db.employees.find({
  isActive: true
});
```

### **Product Scoping**
```javascript
// Branch user sees only their branch products
const products = await db.products.find({
  branchId: userBranchId,
  isActive: true
});
```

### **Invoice Scoping**
```javascript
// Branch user sees only their branch invoices
const invoices = await db.invoices.find({
  branchId: userBranchId,
  isActive: true
});
```

---

## 🚨 Security Testing

### **Test Case: Unauthorized Access**
- **Steps**:
  1. Login as Branch A user
  2. Try to access Branch B data via direct API calls
  3. Verify 403 Forbidden response
  4. Verify no data leakage

### **Test Case: Token Validation**
- **Steps**:
  1. Use expired/invalid token
  2. Try to access branch data
  3. Verify 401 Unauthorized response

### **Test Case: Role Escalation**
- **Steps**:
  1. Login as Staff user
  2. Try to access Admin functions
  3. Verify access denied

---

## 📈 Performance Testing

### **Test Case: Large Dataset**
- **Steps**:
  1. Create multiple branches with large datasets
  2. Test query performance with tenant scoping
  3. Verify indexes are working
  4. Check response times

### **Test Case: Concurrent Users**
- **Steps**:
  1. Multiple users from different branches
  2. Simultaneous operations
  3. Verify data isolation
  4. Check for conflicts

---

## ✅ Acceptance Criteria Checklist

- [ ] **Branch Management**
  - [ ] Admin can create branches
  - [ ] Admin can edit branches
  - [ ] Admin can delete branches
  - [ ] Branch validation works

- [ ] **User Assignment**
  - [ ] Users can be assigned to branches
  - [ ] Role-based permissions work
  - [ ] Membership expiration works

- [ ] **Branch Switching**
  - [ ] Multi-branch users see switcher
  - [ ] Single-branch users don't see switcher
  - [ ] Switching updates all data

- [ ] **Tenant Scoping**
  - [ ] Employees scoped to branch
  - [ ] Products scoped to branch
  - [ ] Invoices scoped to branch
  - [ ] Reports scoped to branch

- [ ] **Security**
  - [ ] No cross-branch data leakage
  - [ ] Proper authentication
  - [ ] Role-based access control

- [ ] **Performance**
  - [ ] Fast queries with scoping
  - [ ] Proper indexing
  - [ ] Concurrent user support

---

## 🐛 Common Issues & Solutions

### **Issue: Branch Switcher Not Showing**
- **Cause**: User has only one branch access
- **Solution**: Assign user to multiple branches

### **Issue: Data Not Scoped**
- **Cause**: API not using tenant context
- **Solution**: Update API to use `getTenantContext()`

### **Issue: Permission Denied**
- **Cause**: User not assigned to branch
- **Solution**: Check user branch membership

### **Issue: Slow Queries**
- **Cause**: Missing indexes on branchId
- **Solution**: Add compound indexes

---

## 🎯 Quick Test Commands

```bash
# Test branch APIs
curl -X GET http://localhost:3000/api/branches
curl -X POST http://localhost:3000/api/branches -d '{"name":"Test Branch"}'

# Test branch switching
curl -X GET http://localhost:3000/api/session/branch
curl -X POST http://localhost:3000/api/session/branch -d '{"branchId":"branch_id"}'

# Test tenant scoping
curl -X GET http://localhost:3000/api/hr/employees
curl -X GET http://localhost:3000/api/products
```

---

## 🎉 Success Criteria

✅ **Multi-branch system is fully functional when:**
1. All branches can be managed by HQ users
2. Users see only their assigned branch data
3. Branch switching works seamlessly
4. No cross-branch data leakage occurs
5. Performance is acceptable with large datasets
6. Security is maintained across all operations

**Happy Testing! 🚀**
