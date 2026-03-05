/**
 * Script: Generate missing slugs for all products
 * 
 * Problem: Products created before slug feature was added have NULL slugs.
 * This prevents them from appearing in sitemap.xml and being indexed by Google.
 * 
 * Usage: cd backend && npx ts-node src/scripts/generate-missing-slugs.ts
 */

import { PrismaClient } from '@prisma/client';

// Vietnamese character mapping
const vietnameseMap: { [key: string]: string } = {
    'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
    'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
    'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
    'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
    'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
    'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
    'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
    'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
    'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
    'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
    'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
    'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
    'đ': 'd',
    'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
    'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',
    'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
    'È': 'E', 'É': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E',
    'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',
    'Ì': 'I', 'Í': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',
    'Ò': 'O', 'Ó': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O',
    'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
    'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',
    'Ù': 'U', 'Ú': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U',
    'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',
    'Ỳ': 'Y', 'Ý': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y',
    'Đ': 'D',
};

function removeVietnameseDiacritics(str: string): string {
    return str.split('').map((char: string) => vietnameseMap[char] || char).join('');
}

function generateSlug(text: string, maxLength: number = 80): string {
    if (!text) return '';
    let slug = text.toLowerCase().trim();
    slug = removeVietnameseDiacritics(slug);
    slug = slug
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');

    if (slug.length > maxLength) {
        slug = slug.substring(0, maxLength);
        const lastHyphen = slug.lastIndexOf('-');
        if (lastHyphen > maxLength - 15) {
            slug = slug.substring(0, lastHyphen);
        }
    }
    return slug;
}

async function main() {
    const prisma = new PrismaClient();

    try {
        // Find all products without slugs
        const productsWithoutSlugs = await prisma.product.findMany({
            where: { slug: null },
            select: { id: true, title: true },
        });

        console.log(`\n🔍 Found ${productsWithoutSlugs.length} products without slugs\n`);

        if (productsWithoutSlugs.length === 0) {
            console.log('✅ All products already have slugs!');
            return;
        }

        // Get all existing slugs for uniqueness check
        const existingSlugs = new Set(
            (await prisma.product.findMany({
                where: { slug: { not: null } },
                select: { slug: true },
            })).map((p: any) => p.slug)
        );

        let updated = 0;
        let failed = 0;

        for (const product of productsWithoutSlugs) {
            try {
                let baseSlug = generateSlug(product.title);

                if (!baseSlug) {
                    // Fallback: use product ID as slug
                    baseSlug = `product-${product.id.substring(0, 8)}`;
                }

                // Ensure uniqueness
                let slug = baseSlug;
                let counter = 1;
                while (existingSlugs.has(slug)) {
                    slug = `${baseSlug}-${counter}`;
                    counter++;
                }

                // Update product
                await prisma.product.update({
                    where: { id: product.id },
                    data: { slug },
                });

                existingSlugs.add(slug);
                updated++;
                const title = product.title.length > 55 ? product.title.substring(0, 55) + '...' : product.title;
                console.log(`  ✅ ${title.padEnd(60)} → ${slug}`);
            } catch (error: any) {
                failed++;
                console.error(`  ❌ Failed: ${product.title.substring(0, 60)} - ${error.message}`);
            }
        }

        console.log(`\n📊 Results:`);
        console.log(`  ✅ Updated: ${updated}`);
        console.log(`  ❌ Failed: ${failed}`);
        console.log(`  📝 Total: ${productsWithoutSlugs.length}\n`);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
