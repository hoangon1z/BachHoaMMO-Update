import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';

const prisma = new PrismaClient();
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/mmomarket';

// Simple Conversation Schema
const conversationSchema = new mongoose.Schema({}, { strict: false });
const Conversation = mongoose.model('Conversation', conversationSchema, 'conversations');

async function fix() {
    try {
        console.log('Connecting to MongoDB:', MONGODB_URL);
        await mongoose.connect(MONGODB_URL);
        console.log('Connected to MongoDB.');

        // Find all 'New Conversation' subjects
        const convs = await Conversation.find({ subject: 'New Conversation' });
        console.log(`Found ${convs.length} conversations to fix.`);

        let updatedCount = 0;

        for (const conv of convs) {
            const dbConv = (conv as any).toObject();
            const resolvedBuyerId = dbConv.buyerId;
            const resolvedSellerId = dbConv.sellerId;
            const type = dbConv.type;

            let defaultSubject = 'Cuộc trò chuyện mới';

            try {
                if (type === 'BUYER_SELLER' && resolvedBuyerId && resolvedSellerId) {
                    const users = await prisma.user.findMany({
                        where: { id: { in: [resolvedBuyerId, resolvedSellerId] } },
                        select: { id: true, name: true, email: true }
                    });
                    const bUser = users.find((u: any) => u.id === resolvedBuyerId);
                    const sUser = users.find((u: any) => u.id === resolvedSellerId);
                    const bName = bUser?.name || bUser?.email?.split('@')[0] || 'Khách';
                    const sName = sUser?.name || sUser?.email?.split('@')[0] || 'Shop';
                    defaultSubject = `${bName} & ${sName}`;
                } else if (type === 'BUYER_ADMIN' && resolvedBuyerId) {
                    const user = await prisma.user.findUnique({ where: { id: resolvedBuyerId }, select: { name: true, email: true } });
                    const name = user?.name || user?.email?.split('@')[0] || 'Khách';
                    defaultSubject = `${name} & Admin`;
                } else if (type === 'SELLER_ADMIN' && resolvedSellerId) {
                    const user = await prisma.user.findUnique({ where: { id: resolvedSellerId }, select: { name: true, email: true } });
                    const name = user?.name || user?.email?.split('@')[0] || 'Shop';
                    defaultSubject = `Shop ${name} & Admin`;
                }
            } catch (e) {
                console.error('Error fetching users:', e);
            }

            await Conversation.updateOne({ _id: (conv as any)._id }, { $set: { subject: defaultSubject } });
            updatedCount++;
        }

        console.log(`Successfully updated ${updatedCount} conversations.`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        await prisma.$disconnect();
    }
}

fix();
