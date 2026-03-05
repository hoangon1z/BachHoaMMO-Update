const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Starting stock synchronization...');

    // Find all digital products with auto-delivery
    const products = await prisma.product.findMany({
        where: {
            isDigital: true,
            autoDelivery: true,
        },
        include: { variants: true },
    });

    console.log(`Creating sync for ${products.length} products...`);

    let updatedCount = 0;

    for (const product of products) {
        // 1. Calculate actual stock from inventory
        const inventoryCount = await prisma.productInventory.count({
            where: {
                productId: product.id,
                status: 'AVAILABLE',
            },
        });

        // 2. Sync product stock if different
        if (product.stock !== inventoryCount) {
            console.log(`[${product.title}] Stock mismatch! DB: ${product.stock}, Real: ${inventoryCount}. Fixing...`);
            await prisma.product.update({
                where: { id: product.id },
                data: { stock: inventoryCount },
            });
            updatedCount++;
        }

        // 3. Sync variant stock if has variants
        if (product.hasVariants && product.variants.length > 0) {
            for (const variant of product.variants) {
                const variantInventoryCount = await prisma.productInventory.count({
                    where: {
                        productId: product.id,
                        variantId: variant.id,
                        status: 'AVAILABLE',
                    },
                });

                if (variant.stock !== variantInventoryCount) {
                    console.log(`  -> Variant [${variant.name}] mismatch! DB: ${variant.stock}, Real: ${variantInventoryCount}. Fixing...`);
                    await prisma.productVariant.update({
                        where: { id: variant.id },
                        data: { stock: variantInventoryCount },
                    });
                }
            }
        }
    }

    console.log(`✅ Stock synchronization complete! Updated ${updatedCount} products.`);
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
