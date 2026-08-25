// One-off utility: imports a legacy mongoexport JSON dump (array of docs)
// into the current Blog model. Slugs/status/read-time are computed by the
// schema hooks on insert. Existing titles are skipped, so it is re-runnable.
//
//   node scripts/import-legacy.js [path-to-json]
//
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { connectDB } = require('../server/db/db');
const Blog = require('../models/blog-model');

(async () => {
    try {
        const file = process.argv[2]
            || path.join(__dirname, '..', '_legacy', 'BlogData.blogdatas.json');

        if (!fs.existsSync(file)) {
            console.error(`[import] file not found: ${file}`);
            process.exit(1);
        }
        const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
        console.log(`[import] ${raw.length} document(s) found in ${path.basename(file)}`);

        await connectDB();

        let added = 0;
        for (const doc of raw) {
            const { _id, __v, createdAt, updatedAt, ...clean } = doc;
            if (await Blog.exists({ title: clean.title })) continue;
            await Blog.create(clean);
            added++;
        }
        console.log(`[import] inserted ${added} post(s). Total now: ${await Blog.countDocuments()}`);
        process.exit(0);
    } catch (err) {
        console.error('[import] failed:', err.message);
        process.exit(1);
    }
})();
