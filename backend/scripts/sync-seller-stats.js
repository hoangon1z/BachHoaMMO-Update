/**
 * Sync Seller Stats Script
 * Recalculates totalSales and rating for all sellers based on their products
 * 
 * Usage: node scripts/sync-seller-stats.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncSellerStats() {
    console.log('🔄 Starting seller stats sync...\n');

    // Get all seller profiles
    const sellerProfiles = await prisma.sellerProfile.findMany({
        include: {
            user: {
                select: { id: true, name: true, email: true },
            },
        },
    });

    console.log(`Found ${sellerProfiles.length} seller profiles to update\n`);

    let updated = 0;
    let skipped = 0;

    for (const profile of sellerProfiles) {
        try {
            // Calculate total sales from all seller's products
            const salesAggregate = await prisma.product.aggregate({
                where: { sellerId: profile.userId, status: 'ACTIVE' },
                _sum: { sales: true },
            });

            // Calculate average rating from products with rating > 0
            const ratingAggregate = await prisma.product.aggregate({
                where: { sellerId: profile.userId, status: 'ACTIVE', rating: { gt: 0 } },
                _avg: { rating: true },
            });

            const newTotalSales = salesAggregate._sum.sales || 0;
            const newRating = ratingAggregate._avg.rating || 0;

            // Only update if values changed
            if (profile.totalSales !== newTotalSales || Math.abs(profile.rating - newRating) > 0.01) {
                await prisma.sellerProfile.update({
                    where: { id: profile.id },
                    data: {
                        totalSales: newTotalSales,
                        rating: newRating,
                    },
                });

                console.log(`✅ Updated: ${profile.user.name || profile.user.email}`);
                console.log(`   - totalSales: ${profile.totalSales} -> ${newTotalSales}`);
                console.log(`   - rating: ${profile.rating.toFixed(2)} -> ${newRating.toFixed(2)}`);
                console.log('');
                updated++;
            } else {
                skipped++;
            }
        } catch (error) {
            console.error(`❌ Error updating ${profile.user?.email}: ${error.message}`);
        }
    }

    console.log('\n========================================');
    console.log(`✅ Updated: ${updated} seller(s)`);
    console.log(`⏭️  Skipped: ${skipped} seller(s) (no changes)`);
    console.log('========================================\n');
}

syncSellerStats()
    .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
