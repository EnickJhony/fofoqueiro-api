const prisma = require('./prisma');

async function main() {
  try {
    const r = await prisma.$queryRawUnsafe('SELECT * FROM news LIMIT 1');
    console.log('RESULT', r);
  } catch (e) {
    console.error('DB ERROR', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
