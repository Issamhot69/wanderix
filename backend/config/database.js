// ═══════════════════════════════════════════════════════
//  WANDERIX — Database Configuration
//  Prisma Client + Connection Pool
// ═══════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');

// ─────────────────────────────────────────
// Singleton Prisma Client
// ─────────────────────────────────────────

const globalForPrisma = global;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],

    errorFormat: 'pretty',
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// ─────────────────────────────────────────
// Connection Test
// ─────────────────────────────────────────

async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    return prisma;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

// ─────────────────────────────────────────
// Disconnect
// ─────────────────────────────────────────

async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
  } catch (error) {
    console.error('❌ Database disconnect failed:', error.message);
  }
}

// ─────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────

async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', message: 'Database is healthy' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

// ─────────────────────────────────────────
// Graceful Shutdown
// ─────────────────────────────────────────

process.on('beforeExit', async () => {
  await disconnectDatabase();
});

process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
  checkDatabaseHealth,
};