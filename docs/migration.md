# Migration Guide - From MongoDB Native to Mongoose

## Overview
This document outlines the migration process from using MongoDB native driver directly to using Mongoose ODM with proper schemas and TypeScript.

## What Changed

### 1. Database Connection
**Before**: Multiple connection functions across files
```javascript
// Old way - multiple connection functions
import { connectToDatabase } from '../../lib/mongodb';
import { getCollection } from '../../lib/mongodb';

const { db } = await connectToDatabase();
const collection = await getCollection('users');
```

**After**: Single centralized connection
```typescript
// New way - single connection
import dbConnect from '../../../lib/db';
import { User } from '../../../models';

await dbConnect();
const user = await User.findOne({ username }).lean();
```

### 2. Data Access
**Before**: Direct collection access
```javascript
const usersCollection = await getCollection('users');
const user = await usersCollection.findOne({ username });
```

**After**: Model-based access
```typescript
const user = await User.findOne({ username }).lean();
```

### 3. Schema Definition
**Before**: Ad-hoc schema creation
```javascript
// No schema validation
const user = {
  username: req.body.username,
  password: req.body.password,
  // No validation, no types
};
```

**After**: Proper Mongoose schemas
```typescript
// Type-safe schemas with validation
const userSchema = new Schema<IUser>({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    minlength: [3, 'Username must be at least 3 characters'],
  },
  // ... more fields with validation
});
```

## Migration Steps

### Step 1: Install Dependencies
```bash
npm install mongoose zod
npm install --save-dev typescript @types/node @types/react @types/react-dom
```

### Step 2: Run Migration Script
```bash
node scripts/migrate-to-mongoose.js
```

### Step 3: Update API Routes
Replace old MongoDB imports with new model imports:

```typescript
// Old
import { getCollection } from '../../../lib/mongodb';
const usersCollection = await getCollection('users');

// New
import dbConnect from '../../../lib/db';
import { User } from '../../../models';
await dbConnect();
const user = await User.findOne({ username }).lean();
```

### Step 4: Update Frontend Components
Update any frontend code that expects the old data structure.

## Data Structure Changes

### Before (Embedded Documents)
```javascript
// Old invoice structure with embedded customer
{
  _id: ObjectId("..."),
  invoiceNumber: "INV-2024-000001",
  customer: {
    name: "John Doe",
    email: "john@example.com",
    phone: "+1234567890"
  },
  items: [...],
  total: 1500
}
```

### After (ObjectId References)
```typescript
// New invoice structure with ObjectId refs
{
  _id: ObjectId("..."),
  invoiceNumber: "INV-2024-000001",
  customerId: ObjectId("customer_id_here"),
  items: [...],
  total: 1500
}

// Customer fetched separately
const customer = await Customer.findById(invoice.customerId).lean();
```

## Benefits of Migration

### 1. Type Safety
- TypeScript interfaces for all models
- Compile-time error checking
- Better IDE support and autocomplete

### 2. Data Validation
- Schema-level validation
- Custom validators
- Pre/post hooks for business logic

### 3. Performance
- Proper indexing strategy
- Query optimization
- Connection pooling

### 4. Maintainability
- Centralized connection management
- Consistent data access patterns
- Better error handling

### 5. Relationships
- Proper ObjectId references
- Population for related data
- Virtual fields for computed properties

## Breaking Changes

### 1. API Response Format
Some API responses may have different field names or structure due to schema changes.

### 2. Data Types
- String fields may have different validation rules
- Number fields may have min/max constraints
- Date fields may have validation rules

### 3. Required Fields
Fields that were optional before may now be required, causing validation errors.

## Rollback Plan

If issues arise during migration:

1. **Stop the application**
2. **Restore from backup** (if available)
3. **Revert code changes** to previous commit
4. **Restart with old MongoDB setup**

## Testing Migration

### 1. Test Data Integrity
- Verify all data migrated correctly
- Check ObjectId references are valid
- Validate required fields are populated

### 2. Test API Endpoints
- Test all CRUD operations
- Verify response formats
- Check error handling

### 3. Test Frontend
- Verify data displays correctly
- Check form submissions work
- Test search and filtering

## Post-Migration Tasks

### 1. Monitor Performance
- Check query performance
- Monitor connection pool usage
- Watch for any errors

### 2. Update Documentation
- Update API documentation
- Update frontend component docs
- Document new data structures

### 3. Train Team
- Explain new patterns
- Show TypeScript benefits
- Demonstrate new validation features

## Common Issues and Solutions

### Issue: Validation Errors
**Cause**: Data doesn't match new schema requirements
**Solution**: Fix data inconsistencies or update schema constraints

### Issue: Missing References
**Cause**: ObjectId references point to non-existent documents
**Solution**: Clean up orphaned references or restore missing documents

### Issue: Performance Degradation
**Cause**: Missing indexes or inefficient queries
**Solution**: Check index usage with `explain()` and add missing indexes

### Issue: Connection Errors
**Cause**: Connection pool configuration issues
**Solution**: Adjust connection pool settings in `lib/db.ts`

## Future Improvements

### 1. Prisma Migration
Consider migrating to Prisma for even better type safety and developer experience.

### 2. Redis Caching
Add Redis for caching frequently accessed data.

### 3. Database Monitoring
Implement comprehensive database monitoring and alerting.

### 4. Automated Testing
Add comprehensive test coverage for all models and API endpoints.
