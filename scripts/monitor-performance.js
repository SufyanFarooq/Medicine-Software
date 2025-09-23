// Performance Monitoring Script
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'business_management';

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      queries: [],
      slowQueries: [],
      errors: [],
      startTime: Date.now()
    };
  }

  // Monitor query performance
  async monitorQuery(name, queryFunction) {
    const startTime = Date.now();
    let result = null;
    let error = null;

    try {
      result = await queryFunction();
    } catch (err) {
      error = err;
      this.metrics.errors.push({
        query: name,
        error: err.message,
        timestamp: new Date()
      });
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    const queryMetric = {
      name,
      duration,
      timestamp: new Date(),
      success: !error
    };

    this.metrics.queries.push(queryMetric);

    // Track slow queries (>1000ms)
    if (duration > 1000) {
      this.metrics.slowQueries.push(queryMetric);
      console.log(`🐌 SLOW QUERY: ${name} took ${duration}ms`);
    }

    return result;
  }

  // Get performance report
  getReport() {
    const totalQueries = this.metrics.queries.length;
    const successfulQueries = this.metrics.queries.filter(q => q.success).length;
    const failedQueries = this.metrics.queries.filter(q => !q.success).length;
    const slowQueries = this.metrics.slowQueries.length;
    
    const avgDuration = this.metrics.queries.reduce((sum, q) => sum + q.duration, 0) / totalQueries;
    const maxDuration = Math.max(...this.metrics.queries.map(q => q.duration));
    const minDuration = Math.min(...this.metrics.queries.map(q => q.duration));

    return {
      summary: {
        totalQueries,
        successfulQueries,
        failedQueries,
        slowQueries,
        successRate: (successfulQueries / totalQueries * 100).toFixed(2) + '%'
      },
      timing: {
        averageDuration: Math.round(avgDuration) + 'ms',
        maxDuration: maxDuration + 'ms',
        minDuration: minDuration + 'ms'
      },
      errors: this.metrics.errors,
      slowQueries: this.metrics.slowQueries
    };
  }

  // Print performance report
  printReport() {
    const report = this.getReport();
    
    console.log('\n📊 Performance Monitoring Report');
    console.log('=====================================');
    console.log(`📈 Total Queries: ${report.summary.totalQueries}`);
    console.log(`✅ Successful: ${report.summary.successfulQueries}`);
    console.log(`❌ Failed: ${report.summary.failedQueries}`);
    console.log(`🐌 Slow Queries: ${report.summary.slowQueries}`);
    console.log(`📊 Success Rate: ${report.summary.successRate}`);
    console.log(`⏱️  Average Duration: ${report.timing.averageDuration}`);
    console.log(`⚡ Fastest Query: ${report.timing.minDuration}`);
    console.log(`🐌 Slowest Query: ${report.timing.maxDuration}`);

    if (report.slowQueries.length > 0) {
      console.log('\n🐌 Slow Queries:');
      report.slowQueries.forEach(query => {
        console.log(`   - ${query.name}: ${query.duration}ms`);
      });
    }

    if (report.errors.length > 0) {
      console.log('\n❌ Errors:');
      report.errors.forEach(error => {
        console.log(`   - ${error.query}: ${error.error}`);
      });
    }
  }
}

async function runPerformanceMonitoring() {
  const client = new MongoClient(MONGODB_URI);
  const monitor = new PerformanceMonitor();
  
  try {
    await client.connect();
    const db = client.db(MONGODB_DB);
    
    console.log('🚀 Starting Performance Monitoring...\n');
    
    // Monitor different types of queries
    await monitor.monitorQuery('Products List', async () => {
      return await db.collection('products')
        .find({ isActive: true })
        .limit(20)
        .toArray();
    });

    await monitor.monitorQuery('Invoices List', async () => {
      return await db.collection('invoices')
        .find({})
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray();
    });

    await monitor.monitorQuery('Customers List', async () => {
      return await db.collection('customers')
        .find({ isActive: true })
        .limit(20)
        .toArray();
    });

    await monitor.monitorQuery('Products Search', async () => {
      return await db.collection('products')
        .find({ 
          $or: [
            { name: { $regex: 'test', $options: 'i' } },
            { sku: { $regex: 'test', $options: 'i' } }
          ]
        })
        .limit(10)
        .toArray();
    });

    await monitor.monitorQuery('Categories Count', async () => {
      return await db.collection('categories')
        .countDocuments({ isActive: true });
    });

    await monitor.monitorQuery('Activities Recent', async () => {
      return await db.collection('activities')
        .find({})
        .sort({ timestamp: -1 })
        .limit(10)
        .toArray();
    });

    // Print the performance report
    monitor.printReport();
    
  } catch (error) {
    console.error('❌ Performance monitoring error:', error);
  } finally {
    await client.close();
  }
}

// Run the monitoring
runPerformanceMonitoring();
