require('dotenv').config();
const bcrypt = require('bcryptjs');
const User = require('../models/user-model');
const Blog = require('../models/blog-model');
const sampleArticles = require('../sampleArticles');

/**
 * Creates the first admin account if the users collection is empty.
 * Credentials come from .env (ADMIN_USERNAME / ADMIN_PASSWORD).
 * Called automatically on every boot — safe to run repeatedly.
 */
async function seedAdminIfEmpty() {
    try {
        if ((await User.estimatedDocumentCount()) > 0) return;
        const username = process.env.ADMIN_USERNAME || 'admin';
        const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
        await User.create({ username, passwordHash: bcrypt.hashSync(password, 10) });
        console.log(`[seed] created admin account "${username}".`);
        console.log('[seed] ⚠  It uses ADMIN_PASSWORD from your .env — log in and change it for any real deployment.');
    } catch (err) {
        console.error('[seed] admin seeding skipped:', err.message);
    }
}

/** Inserts or updates sampleArticles.js into the blog collection. */
async function seedSampleArticles() {
    let added = 0;
    let updated = 0;
    for (const a of sampleArticles) {
        const existing = await Blog.findOne({ title: a.title });
        if (existing) {
            existing.summary = a.summary;
            existing.imgUrl = a.imgUrl;
            existing.imgUrl2 = a.imgUrl2;
            existing.article1 = a.article1;
            existing.article2 = a.article2;
            existing.author = a.author;
            existing.category = a.category || 'general';
            existing.tags = a.tags || [];
            existing.status = a.status || 'published';
            existing.readTime = ''; // Auto-recomputed by pre-validate hook
            await existing.save();
            updated++;
            continue;
        }
        await Blog.create({ category: 'general', status: 'published', ...a });
        added++;
    }
    console.log(`[seed] inserted ${added} new article(s), updated ${updated} existing article(s).`);
}

// CLI usage: npm run seed
if (require.main === module) {
    const { connectDB } = require('../server/db/db');
    (async () => {
        try {
            await connectDB();
            await seedAdminIfEmpty();
            await seedSampleArticles();
            process.exit(0);
        } catch (err) {
            console.error('[seed] failed:', err.message);
            process.exit(1);
        }
    })();
}

module.exports = { seedAdminIfEmpty, seedSampleArticles };
