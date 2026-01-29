import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create categories
  const categories = [
    { name: 'Game Accounts', slug: 'game-accounts', icon: '🎮', description: 'Tài khoản game các loại' },
    { name: 'Gift Cards', slug: 'gift-cards', icon: '🎁', description: 'Thẻ quà tặng và voucher' },
    { name: 'Game Items', slug: 'game-items', icon: '⚔️', description: 'Vật phẩm trong game' },
    { name: 'Software', slug: 'software', icon: '💻', description: 'Phần mềm và license key' },
    { name: 'Digital Services', slug: 'digital-services', icon: '🔧', description: 'Dịch vụ số' },
    { name: 'Education', slug: 'education', icon: '📚', description: 'Khóa học online' },
  ];

  console.log('Creating categories...');
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  // Create test users
  const hashedPassword = await bcrypt.hash('123456', 10);

  console.log('Creating users...');
  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@test.com' },
    update: {},
    create: {
      email: 'buyer@test.com',
      password: hashedPassword,
      name: 'Test Buyer',
      role: 'BUYER',
    },
  });

  const seller1 = await prisma.user.upsert({
    where: { email: 'seller1@test.com' },
    update: {},
    create: {
      email: 'seller1@test.com',
      password: hashedPassword,
      name: 'Gaming Store',
      role: 'SELLER',
      isSeller: true,
      sellerProfile: {
        create: {
          shopName: 'Gaming Paradise',
          shopDescription: 'Chuyên cung cấp tài khoản game uy tín',
          rating: 4.8,
          totalSales: 150,
          isVerified: true,
        },
      },
    },
  });

  const seller2 = await prisma.user.upsert({
    where: { email: 'seller2@test.com' },
    update: {},
    create: {
      email: 'seller2@test.com',
      password: hashedPassword,
      name: 'Digital Shop',
      role: 'SELLER',
      isSeller: true,
      sellerProfile: {
        create: {
          shopName: 'Digital Market',
          shopDescription: 'Sản phẩm số chất lượng cao',
          rating: 4.6,
          totalSales: 89,
          isVerified: true,
        },
      },
    },
  });

  // Get categories
  const gameAccountsCat = await prisma.category.findUnique({ where: { slug: 'game-accounts' } });
  const giftCardsCat = await prisma.category.findUnique({ where: { slug: 'gift-cards' } });
  const softwareCat = await prisma.category.findUnique({ where: { slug: 'software' } });
  const educationCat = await prisma.category.findUnique({ where: { slug: 'education' } });

  // Create products
  console.log('Creating products...');
  const products = [
    {
      title: 'Tài khoản Steam với 50+ games',
      description: 'Tài khoản Steam đầy đủ thông tin, có hơn 50 game AAA như GTA V, Cyberpunk 2077, Red Dead Redemption 2...',
      price: 500000,
      salePrice: 450000,
      stock: 5,
      images: JSON.stringify([
        'https://picsum.photos/seed/steam1/800/600',
        'https://picsum.photos/seed/steam2/800/600',
        'https://picsum.photos/seed/steam3/800/600',
        'https://picsum.photos/seed/steam4/800/600'
      ]),
      categoryId: gameAccountsCat?.id,
      sellerId: seller1.id,
      status: 'ACTIVE',
      sales: 45,
      rating: 4.9,
    },
    {
      title: 'Tài khoản Valorant - Immortal Rank',
      description: 'Tài khoản Valorant rank Immortal, nhiều skin đẹp, đầy đủ agent. Bảo hành 30 ngày.',
      price: 800000,
      stock: 3,
      images: JSON.stringify([
        'https://picsum.photos/seed/valorant1/800/600',
        'https://picsum.photos/seed/valorant2/800/600',
        'https://picsum.photos/seed/valorant3/800/600'
      ]),
      categoryId: gameAccountsCat?.id,
      sellerId: seller1.id,
      status: 'ACTIVE',
      sales: 23,
      rating: 4.8,
    },
    {
      title: 'Steam Gift Card $50',
      description: 'Steam gift card trị giá $50, giao code ngay sau khi thanh toán. Bảo hành đổi trả nếu code lỗi.',
      price: 1200000,
      stock: 100,
      images: JSON.stringify([
        'https://picsum.photos/seed/giftcard1/800/600',
        'https://picsum.photos/seed/giftcard2/800/600',
        'https://picsum.photos/seed/giftcard3/800/600'
      ]),
      categoryId: giftCardsCat?.id,
      sellerId: seller2.id,
      status: 'ACTIVE',
      sales: 156,
      rating: 5.0,
    },
    {
      title: 'Spotify Premium - 12 tháng',
      description: 'Tài khoản Spotify Premium 12 tháng, nghe nhạc không quảng cáo, chất lượng cao.',
      price: 150000,
      salePrice: 129000,
      stock: 50,
      images: JSON.stringify([
        'https://picsum.photos/seed/spotify1/800/600',
        'https://picsum.photos/seed/spotify2/800/600',
        'https://picsum.photos/seed/spotify3/800/600',
        'https://picsum.photos/seed/spotify4/800/600'
      ]),
      categoryId: giftCardsCat?.id,
      sellerId: seller2.id,
      status: 'ACTIVE',
      sales: 89,
      rating: 4.7,
    },
    {
      title: 'Windows 11 Pro License Key',
      description: 'Key Windows 11 Pro bản quyền vĩnh viễn, kích hoạt online, hỗ trợ cài đặt.',
      price: 250000,
      stock: 200,
      images: JSON.stringify([
        'https://picsum.photos/seed/windows1/800/600',
        'https://picsum.photos/seed/windows2/800/600',
        'https://picsum.photos/seed/windows3/800/600'
      ]),
      categoryId: softwareCat?.id,
      sellerId: seller2.id,
      status: 'ACTIVE',
      sales: 234,
      rating: 4.9,
    },
    {
      title: 'Adobe Creative Cloud - 1 năm',
      description: 'Tài khoản Adobe Creative Cloud đầy đủ app (Photoshop, Illustrator, Premiere Pro...) sử dụng 1 năm.',
      price: 800000,
      salePrice: 699000,
      stock: 10,
      images: JSON.stringify([
        'https://picsum.photos/seed/adobe1/800/600',
        'https://picsum.photos/seed/adobe2/800/600',
        'https://picsum.photos/seed/adobe3/800/600',
        'https://picsum.photos/seed/adobe4/800/600'
      ]),
      categoryId: softwareCat?.id,
      sellerId: seller2.id,
      status: 'ACTIVE',
      sales: 67,
      rating: 4.8,
    },
    {
      title: 'Khóa học Fullstack Web Development',
      description: 'Khóa học lập trình web fullstack từ zero đến hero. Bao gồm HTML, CSS, JavaScript, React, Node.js...',
      price: 1500000,
      salePrice: 999000,
      stock: 999,
      images: JSON.stringify([
        'https://picsum.photos/seed/course1/800/600',
        'https://picsum.photos/seed/course2/800/600',
        'https://picsum.photos/seed/course3/800/600'
      ]),
      categoryId: educationCat?.id,
      sellerId: seller1.id,
      status: 'ACTIVE',
      sales: 345,
      rating: 4.9,
    },
    {
      title: 'Tài khoản League of Legends - Diamond',
      description: 'Tài khoản LoL rank Diamond, nhiều skin đẹp, full champion. Đã xác minh email.',
      price: 600000,
      stock: 7,
      images: JSON.stringify([
        'https://picsum.photos/seed/lol1/800/600',
        'https://picsum.photos/seed/lol2/800/600',
        'https://picsum.photos/seed/lol3/800/600',
        'https://picsum.photos/seed/lol4/800/600'
      ]),
      categoryId: gameAccountsCat?.id,
      sellerId: seller1.id,
      status: 'ACTIVE',
      sales: 34,
      rating: 4.7,
    },
    {
      title: 'Netflix Premium - 12 tháng',
      description: 'Tài khoản Netflix Premium 12 tháng, xem 4K, 4 màn hình cùng lúc.',
      price: 300000,
      salePrice: 250000,
      stock: 30,
      images: JSON.stringify([
        'https://picsum.photos/seed/netflix1/800/600',
        'https://picsum.photos/seed/netflix2/800/600',
        'https://picsum.photos/seed/netflix3/800/600'
      ]),
      categoryId: giftCardsCat?.id,
      sellerId: seller2.id,
      status: 'ACTIVE',
      sales: 178,
      rating: 4.8,
    },
    {
      title: 'ChatGPT Plus - 1 tháng',
      description: 'Tài khoản ChatGPT Plus sử dụng GPT-4, truy cập không giới hạn.',
      price: 400000,
      stock: 15,
      images: JSON.stringify([
        'https://picsum.photos/seed/chatgpt1/800/600',
        'https://picsum.photos/seed/chatgpt2/800/600',
        'https://picsum.photos/seed/chatgpt3/800/600',
        'https://picsum.photos/seed/chatgpt4/800/600'
      ]),
      categoryId: softwareCat?.id,
      sellerId: seller2.id,
      status: 'ACTIVE',
      sales: 123,
      rating: 5.0,
    },
    {
      title: 'Tài khoản Genshin Impact AR55',
      description: 'Tài khoản Genshin Impact AR55, nhiều 5 sao, weapon đầy đủ.',
      price: 1200000,
      stock: 2,
      images: JSON.stringify([
        'https://picsum.photos/seed/genshin1/800/600',
        'https://picsum.photos/seed/genshin2/800/600',
        'https://picsum.photos/seed/genshin3/800/600'
      ]),
      categoryId: gameAccountsCat?.id,
      sellerId: seller1.id,
      status: 'ACTIVE',
      sales: 12,
      rating: 4.9,
    },
    {
      title: 'Canva Pro - 12 tháng',
      description: 'Tài khoản Canva Pro 12 tháng, thiết kế đồ họa chuyên nghiệp.',
      price: 200000,
      salePrice: 159000,
      stock: 40,
      images: JSON.stringify([
        'https://picsum.photos/seed/canva1/800/600',
        'https://picsum.photos/seed/canva2/800/600',
        'https://picsum.photos/seed/canva3/800/600',
        'https://picsum.photos/seed/canva4/800/600'
      ]),
      categoryId: softwareCat?.id,
      sellerId: seller2.id,
      status: 'ACTIVE',
      sales: 98,
      rating: 4.7,
    },
  ];

  for (const product of products) {
    await prisma.product.create({
      data: product,
    });
  }

  // Seed Account Templates
  console.log('🔧 Seeding account templates...');
  
  const accountTemplates = [
    {
      name: 'Facebook',
      slug: 'facebook',
      format: 'username|password|2fa|email|cookie',
      fields: JSON.stringify(['username', 'password', '2fa', 'email', 'cookie']),
      fieldLabels: JSON.stringify({
        username: 'Tên đăng nhập',
        password: 'Mật khẩu',
        '2fa': 'Mã 2FA',
        email: 'Email liên kết',
        cookie: 'Cookie'
      }),
      icon: '📘',
      description: 'Tài khoản Facebook với đầy đủ thông tin',
      disputeWindow: 24,
    },
    {
      name: 'Gmail',
      slug: 'gmail',
      format: 'email|password|recovery_email',
      fields: JSON.stringify(['email', 'password', 'recovery_email']),
      fieldLabels: JSON.stringify({
        email: 'Email',
        password: 'Mật khẩu',
        recovery_email: 'Email khôi phục'
      }),
      icon: '📧',
      description: 'Tài khoản Gmail',
      disputeWindow: 24,
    },
    {
      name: 'Netflix',
      slug: 'netflix',
      format: 'email|password',
      fields: JSON.stringify(['email', 'password']),
      fieldLabels: JSON.stringify({
        email: 'Email',
        password: 'Mật khẩu'
      }),
      icon: '🎬',
      description: 'Tài khoản Netflix Premium',
      disputeWindow: 24,
    },
    {
      name: 'Spotify',
      slug: 'spotify',
      format: 'email|password|country',
      fields: JSON.stringify(['email', 'password', 'country']),
      fieldLabels: JSON.stringify({
        email: 'Email',
        password: 'Mật khẩu',
        country: 'Quốc gia'
      }),
      icon: '🎵',
      description: 'Tài khoản Spotify Premium',
      disputeWindow: 24,
    },
    {
      name: 'Instagram',
      slug: 'instagram',
      format: 'username|password|email|2fa',
      fields: JSON.stringify(['username', 'password', 'email', '2fa']),
      fieldLabels: JSON.stringify({
        username: 'Tên đăng nhập',
        password: 'Mật khẩu',
        email: 'Email',
        '2fa': 'Mã 2FA'
      }),
      icon: '📸',
      description: 'Tài khoản Instagram',
      disputeWindow: 24,
    },
    {
      name: 'ChatGPT',
      slug: 'chatgpt',
      format: 'email|password',
      fields: JSON.stringify(['email', 'password']),
      fieldLabels: JSON.stringify({
        email: 'Email',
        password: 'Mật khẩu'
      }),
      icon: '🤖',
      description: 'Tài khoản ChatGPT Plus',
      disputeWindow: 24,
    },
    {
      name: 'Steam Key',
      slug: 'steam-key',
      format: 'key',
      fields: JSON.stringify(['key']),
      fieldLabels: JSON.stringify({
        key: 'Steam Key'
      }),
      icon: '🎮',
      description: 'Steam Game Key',
      disputeWindow: 1, // 1 giờ cho game key
    },
    {
      name: 'Canva',
      slug: 'canva',
      format: 'email|password',
      fields: JSON.stringify(['email', 'password']),
      fieldLabels: JSON.stringify({
        email: 'Email',
        password: 'Mật khẩu'
      }),
      icon: '🎨',
      description: 'Tài khoản Canva Pro',
      disputeWindow: 48,
    },
    {
      name: 'Adobe Creative Cloud',
      slug: 'adobe',
      format: 'email|password',
      fields: JSON.stringify(['email', 'password']),
      fieldLabels: JSON.stringify({
        email: 'Email',
        password: 'Mật khẩu'
      }),
      icon: '🖼️',
      description: 'Tài khoản Adobe Creative Cloud',
      disputeWindow: 48,
    },
    {
      name: 'Windows Key',
      slug: 'windows-key',
      format: 'key',
      fields: JSON.stringify(['key']),
      fieldLabels: JSON.stringify({
        key: 'Product Key'
      }),
      icon: '🪟',
      description: 'Windows License Key',
      disputeWindow: 48,
    },
    {
      name: 'Office 365',
      slug: 'office365',
      format: 'email|password',
      fields: JSON.stringify(['email', 'password']),
      fieldLabels: JSON.stringify({
        email: 'Email',
        password: 'Mật khẩu'
      }),
      icon: '📊',
      description: 'Tài khoản Microsoft Office 365',
      disputeWindow: 48,
    },
    {
      name: 'Custom',
      slug: 'custom',
      format: 'data',
      fields: JSON.stringify(['data']),
      fieldLabels: JSON.stringify({
        data: 'Dữ liệu'
      }),
      icon: '📦',
      description: 'Định dạng tùy chỉnh',
      disputeWindow: 24,
    },
  ];

  for (const template of accountTemplates) {
    await prisma.accountTemplate.upsert({
      where: { slug: template.slug },
      update: template,
      create: template,
    });
  }

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
