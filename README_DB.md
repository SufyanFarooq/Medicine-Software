# Database Documentation - Crane Management System

## Overview
This document explains the database architecture, models, and best practices for the Crane Management System.

## Architecture

### Database Connection
- **Single Connection**: Uses a centralized MongoDB connection singleton in `lib/db.ts`
- **Connection Pooling**: Configured with optimal connection pool settings
- **Graceful Shutdown**: Handles SIGINT and SIGTERM signals properly

### Models Structure
All models are located in the `models/` directory and follow consistent patterns:
- TypeScript interfaces for type safety
- Mongoose schemas with validation
- Proper indexing for performance
- Timestamps for audit trails

## Models

### 1. User Model (`models/User.ts`)
**Purpose**: System users and authentication
**Key Features**:
- Password hashing with bcrypt
- Role-based access control
- Active/inactive status tracking
- Permission management

**Indexes**:
- `username` (unique)
- `role` + `isActive` (compound)
- `username` + `isActive` (compound)

### 2. Crane Model (`models/Crane.ts`)
**Purpose**: Crane inventory and specifications
**Key Features**:
- Type validation (Mobile, All Terrain, Crawler)
- Status tracking (Available, In Use, Maintenance, Out of Service)
- Maintenance scheduling
- Text search capabilities

**Indexes**:
- `code` (unique)
- `status` + `location` (compound)
- `type` + `status` (compound)
- `status` + `nextMaintenance` (compound)
- `name` + `code` (text search)

### 3. Customer Model (`models/Customer.ts`)
**Purpose**: Customer information management
**Key Features**:
- Contact information validation
- Company association
- Search optimization

**Indexes**:
- `name` + `company` (compound)
- `email` + `phone` (compound)
- `name` + `company` (text search)

### 4. CraneRental Model (`models/CraneRental.ts`)
**Purpose**: Crane rental contracts
**Key Features**:
- Date validation (start < end)
- Duration calculation
- Status tracking
- Virtual fields for active/overdue status

**Indexes**:
- `customerId` + `status` (compound)
- `craneId` + `status` (compound)
- `startDate` + `endDate` (compound)
- `status` + `startDate` (compound)

### 5. Invoice Model (`models/Invoice.ts`)
**Purpose**: Customer billing and invoicing
**Key Features**:
- Auto-generated invoice numbers
- Item-based billing
- Discount calculation
- Due date tracking

**Indexes**:
- `invoiceNumber` (unique)
- `customerId` + `status` (compound)
- `customerId` + `date` (compound)
- `status` + `date` (compound)

### 6. Return Model (`models/Return.ts`)
**Purpose**: Return and refund processing
**Key Features**:
- Invoice association
- Refund amount tracking
- Status workflow

**Indexes**:
- `customerId` + `status` (compound)
- `invoiceId` + `status` (compound)
- `craneId` + `status` (compound)

### 7. Activity Model (`models/Activity.ts`)
**Purpose**: User activity logging
**Key Features**:
- Comprehensive audit trail
- Entity association
- Text search capabilities

**Indexes**:
- `userId` + `createdAt` (compound)
- `action` + `createdAt` (compound)
- `entityType` + `entityId` (compound)
- `createdAt` (descending)
- `action` + `details` (text search)

### 8. Settings Model (`models/Settings.ts`)
**Purpose**: System configuration
**Key Features**:
- Singleton collection
- Business rule configuration
- Currency and discount settings

**Indexes**:
- Single document constraint

### 9. InventoryTransaction Model (`models/InventoryTransaction.ts`)
**Purpose**: Stock movement tracking
**Key Features**:
- Transaction type categorization
- Date-based tracking
- Notes for audit trail

**Indexes**:
- `craneId` + `type` (compound)
- `craneId` + `date` (compound)
- `type` + `date` (compound)

## Relationships

### Referencing vs Embedding

**Use ObjectId Refs When**:
- Related entity exists independently
- You need independent lifecycle management
- Arrays can grow large
- You need to query across relationships
- You need to update related data independently

**Use Embedding When**:
- Sub-data is small and immutable
- Data is only meaningful within parent context
- You need atomic updates
- Performance is critical for read-heavy operations

### Current Relationships
```
User ←→ Activity (1:many)
Customer ←→ CraneRental (1:many)
Customer ←→ Invoice (1:many)
Customer ←→ Return (1:many)
Crane ←→ CraneRental (1:many)
Crane ←→ InventoryTransaction (1:many)
CraneRental ←→ Invoice (1:1)
Invoice ←→ Return (1:many)
```

## Validation

### Zod Schemas
All API endpoints use Zod schemas for request validation:
- Input sanitization
- Type coercion
- Custom error messages
- Nested validation

### Mongoose Validation
- Field-level validation
- Custom validators
- Pre/post hooks
- Schema-level constraints

## Performance Optimization

### Indexing Strategy
1. **Single Field Indexes**: Unique fields, frequently queried fields
2. **Compound Indexes**: Multi-field queries, sort operations
3. **Text Indexes**: Full-text search capabilities
4. **Covered Queries**: Index-only queries where possible

### Query Optimization
- Use `.lean()` for read-only operations
- Selective field projection with `.select()`
- Pagination with cursor-based approach
- Aggregation pipelines for complex queries

### Connection Management
- Connection pooling (maxPoolSize: 10)
- Connection reuse across requests
- Proper error handling and reconnection

## Migration

### Running Migrations
```bash
# Run the migration script
node scripts/migrate-to-mongoose.js

# Or import and run programmatically
const { migrateToMongoose } = require('./scripts/migrate-to-mongoose');
await migrateToMongoose();
```

### Migration Process
1. **Data Preservation**: Existing data is preserved with original IDs
2. **Schema Validation**: Data is validated against new schemas
3. **Relationship Mapping**: ObjectId references are properly established
4. **Index Creation**: All indexes are created for optimal performance

## Best Practices

### Adding New Models
1. Create TypeScript interface extending `Document`
2. Define Mongoose schema with validation
3. Add appropriate indexes
4. Export from `models/index.ts`
5. Add Zod validation schemas
6. Update API routes to use new model

### Adding Relationships
1. Use `Schema.Types.ObjectId` with `ref` for references
2. Add compound indexes for relationship queries
3. Use `.populate()` for fetching related data
4. Consider virtual fields for computed properties

### Performance Considerations
1. **Indexes**: Create indexes for all query patterns
2. **Projection**: Use `.select()` to limit returned fields
3. **Pagination**: Implement cursor-based pagination for large datasets
4. **Aggregation**: Use aggregation pipelines for complex operations
5. **Caching**: Consider Redis for frequently accessed data

### Security
1. **Input Validation**: Always validate with Zod schemas
2. **Authentication**: Verify JWT tokens for protected routes
3. **Authorization**: Check user permissions before operations
4. **Data Sanitization**: Use Mongoose sanitization features

## Troubleshooting

### Common Issues
1. **Connection Errors**: Check MongoDB service and connection string
2. **Validation Errors**: Verify input data matches Zod schemas
3. **Performance Issues**: Check index usage with `explain()`
4. **Memory Leaks**: Ensure proper connection cleanup

### Debugging
1. **MongoDB Logs**: Check MongoDB server logs
2. **Query Performance**: Use `explain()` for slow queries
3. **Connection Status**: Monitor connection pool metrics
4. **Index Usage**: Verify indexes are being used

## Future Improvements

### Planned Enhancements
1. **Prisma Migration**: Consider migrating to Prisma for better type safety
2. **Redis Integration**: Add caching layer for performance
3. **Database Sharding**: Scale horizontally for large datasets
4. **Real-time Updates**: WebSocket integration for live data

### Monitoring
1. **Performance Metrics**: Track query performance
2. **Connection Monitoring**: Monitor connection pool health
3. **Index Usage**: Track index effectiveness
4. **Error Tracking**: Monitor validation and connection errors
