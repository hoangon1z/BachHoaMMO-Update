/**
 * Script to setup category hierarchy
 * Run: npx ts-node scripts/setup-categories.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Setting up category hierarchy...\n');

  // 1. Create 4 parent categories
  const parentCategories = [
    { name: 'Tài khoản', slug: 'tai-khoan', description: 'Các loại tài khoản số' },
    { name: 'Phần mềm', slug: 'phan-mem', description: 'Key bản quyền phần mềm' },
    { name: 'Dịch vụ', slug: 'dich-vu', description: 'Các dịch vụ MMO' },
    { name: 'Khác', slug: 'khac', description: 'Sản phẩm khác' },
  ];

  const createdParents: Record<string, string> = {};

  for (const cat of parentCategories) {
    const existing = await prisma.category.findUnique({ where: { slug: cat.slug } });
    if (existing) {
      console.log(`✓ Parent "${cat.name}" already exists (${existing.id})`);
      createdParents[cat.name] = existing.id;
    } else {
      const created = await prisma.category.create({ data: cat });
      console.log(`✓ Created parent "${cat.name}" (${created.id})`);
      createdParents[cat.name] = created.id;
    }
  }

  // 2. Map existing categories to parents
  const categoryMapping: Record<string, string> = {
    // Tài khoản
    'tai-khoan-netflix': 'Tài khoản',
    'tai-khoan-spotiffy': 'Tài khoản',
    'tai-khoan-facebook': 'Tài khoản',
    'tai-khoan-youtube': 'Tài khoản',
    'tai-khoan-telegram': 'Tài khoản',
    'tai-khoan-ai': 'Tài khoản',
    'tai-khoan-canva': 'Tài khoản',
    'tai-khoan-cap-cut': 'Tài khoản',
    'tai-khoan-hoc-tap': 'Tài khoản',
    'tai-khoan-vpn-proxy': 'Tài khoản',
    // Phần mềm
    'key-van-phong-do-hoa': 'Phần mềm',
    'tai-khoan-adobe': 'Phần mềm',
  };

  console.log('\n📁 Assigning children to parents...\n');

  for (const [slug, parentName] of Object.entries(categoryMapping)) {
    const parentId = createdParents[parentName];
    if (!parentId) {
      console.log(`⚠ Parent "${parentName}" not found, skipping ${slug}`);
      continue;
    }

    const child = await prisma.category.findUnique({ where: { slug } });
    if (!child) {
      console.log(`⚠ Child "${slug}" not found, skipping`);
      continue;
    }

    // Skip if already a child of the new parent categories
    if (child.parentId && Object.values(createdParents).includes(child.parentId)) {
      console.log(`✓ "${child.name}" already has parent`);
      continue;
    }

    await prisma.category.update({
      where: { id: child.id },
      data: { parentId },
    });
    console.log(`✓ Assigned "${child.name}" → "${parentName}"`);
  }

  console.log('\n✅ Category hierarchy setup complete!\n');

  // Show final structure
  const parents = await prisma.category.findMany({
    where: { parentId: null },
    include: { children: true },
    orderBy: { name: 'asc' },
  });

  console.log('📊 Final structure:');
  for (const parent of parents) {
    console.log(`\n📁 ${parent.name} (${parent.children.length} children)`);
    for (const child of parent.children) {
      console.log(`   └─ ${child.name}`);
    }
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
