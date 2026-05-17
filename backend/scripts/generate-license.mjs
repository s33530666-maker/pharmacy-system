import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Parse args
const args = process.argv.slice(2);
let pharmacyName = null;
let type = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--pharmacy') {
    pharmacyName = args[i + 1];
  } else if (args[i] === '--type') {
    type = args[i + 1];
  }
}

if (!pharmacyName || !type) {
  console.error('Usage: node scripts/generate-license.mjs --pharmacy "Pharmacy Name" --type MONTHLY|YEARLY|LIFETIME');
  process.exit(1);
}

if (!['MONTHLY', 'YEARLY', 'LIFETIME'].includes(type)) {
  console.error('Error: type must be MONTHLY, YEARLY, or LIFETIME');
  process.exit(1);
}

// Generate unique key PHARM-XXXX-XXXX-XXXX
function generateKey() {
  const random = crypto.randomBytes(6).toString('hex').toUpperCase(); // 12 chars
  return `PHARM-${random.slice(0, 4)}-${random.slice(4, 8)}-${random.slice(8, 12)}`;
}

async function main() {
  const licenseKey = generateKey();

  const license = await prisma.license.create({
    data: {
      pharmacyName: pharmacyName.trim(),
      licenseKey,
      type,
      status: 'ACTIVE',
      usedAt: null,
      expiresAt: null
    }
  });

  console.log('--- License Generated ---');
  console.log(`Pharmacy Name: ${license.pharmacyName}`);
  console.log(`License Type : ${license.type}`);
  console.log(`License Key  : ${license.licenseKey}`);
  console.log('-------------------------');
}

main()
  .catch(e => {
    console.error('Error generating license:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
