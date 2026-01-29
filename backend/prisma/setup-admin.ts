import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Setting up Admin and Test Data...\n');

  const hashedPassword = await bcrypt.hash('admin123', 10);
  const hashedUserPassword = await bcrypt.hash('123456', 10);

  // 1. Create Admin User
  console.log('👑 Creating admin user...');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@BachHoaMMO.vn' },
    update: { role: 'ADMIN', password: hashedPassword },
    create: {
      email: 'admin@BachHoaMMO.vn',
      password: hashedPassword,
      name: 'Admin',
      role: 'ADMIN',
      balance: 0,
    },
  });
  console.log('✅ Admin created: admin@BachHoaMMO.vn / admin123\n');

  // 2. Add balance to test users
  console.log('💰 Adding balance to test users...');
  
  await prisma.user.updateMany({
    where: { email: 'buyer@test.com' },
    data: { balance: 1000000 },
  });
  console.log('✅ buyer@test.com: 1,000,000 VND');

  await prisma.user.updateMany({
    where: { email: 'seller1@test.com' },
    data: { balance: 500000 },
  });
  console.log('✅ seller1@test.com: 500,000 VND');

  await prisma.user.updateMany({
    where: { email: 'seller2@test.com' },
    data: { balance: 500000 },
  });
  console.log('✅ seller2@test.com: 500,000 VND\n');

  // 3. Create some test transactions
  console.log('📝 Creating test transactions...');
  
  const buyer = await prisma.user.findUnique({ where: { email: 'buyer@test.com' } });
  
  if (buyer) {
    // Create a pending recharge request for testing admin approval
    await prisma.transaction.create({
      data: {
        userId: buyer.id,
        type: 'DEPOSIT',
        amount: 500000,
        status: 'PENDING',
        description: 'Yêu cầu nạp tiền - Chờ admin duyệt',
        metadata: JSON.stringify({
          paymentMethod: 'bank',
          bankName: 'Vietcombank',
        }),
      },
    });
    console.log('✅ Created pending recharge request (500,000 VND)\n');
  }

  console.log('🎉 Setup completed!\n');
  console.log('📋 Test Accounts:');
  console.log('   👑 Admin: admin@BachHoaMMO.vn / admin123');
  console.log('   👤 Buyer: buyer@test.com / 123456 (1,000,000 VND)');
  console.log('   🏪 Seller1: seller1@test.com / 123456 (500,000 VND)');
  console.log('   🏪 Seller2: seller2@test.com / 123456 (500,000 VND)');
}

main()
  .catch((e) => {
    console.error('❌ Setup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
