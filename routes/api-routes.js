const express = require('express');
const router = express.Router();
const Blog = require('../models/blog-model');
const { requireAuth } = require('../middleware/auth');
const { pickBlogFields } = require('../utils/helpers');

// Validation helper: returns [normalizedFields, errorMessage]
function validateBody(body) {
    const fields = pickBlogFields(body);
    if (!fields.title)   return [null, 'Title is required'];
    if (!fields.summary) return [null, 'Summary is required'];
    if (!fields.author)  return [null, 'Author is required'];
    return [fields, null];
}

// GET /api/posts  – paginated + filters: ?page&limit&q&tag&category&author&status
router.get('/posts', async (req, res, next) => {
    try {
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

        const filter = {};
        // Public callers only see non-drafts; authenticated callers may request ?status=draft
        if (!(req.session && req.session.userId && req.query.status === 'draft')) {
            filter.status = { $ne: 'draft' };
        }
        if (req.query.q)        Object.assign(filter, Blog.searchFilter(req.query.q));
        if (req.query.tag)      filter.tags = String(req.query.tag).toLowerCase();
        if (req.query.category) filter.category = String(req.query.category).toLowerCase();
        if (req.query.author)   filter.author = new RegExp(`^${require('../utils/helpers').escapeRegExp(req.query.author)}$`, 'i');

        const [posts, total] = await Promise.all([
            Blog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            Blog.countDocuments(filter),
        ]);

        res.json({ page, limit, total, totalPages: Math.ceil(total / limit) || 1, posts });
    } catch (err) { next(err); }
});

// GET /api/posts/:idOrSlug
router.get('/posts/:id', async (req, res, next) => {
    try {
        const post = await Blog.findByIdOrSlug(req.params.id).lean();
        if (!post || (post.status === 'draft' && !(req.session && req.session.userId))) {
            return res.status(404).json({ error: 'Post not found' });
        }
        res.json(post);
    } catch (err) { next(err); }
});

// POST /api/posts – create (auth required)
router.post('/posts', requireAuth, async (req, res, next) => {
    try {
        const [fields, error] = validateBody(req.body);
        if (error) return res.status(400).json({ error });
        const post = await Blog.create(fields);
        res.status(201).json(post);
    } catch (err) { next(err); }
});

// PATCH /api/posts/:id – partial update (auth required).
// Merges the patch onto the existing document so partial bodies
// (e.g. {"status":"draft"}) pass validation, then save() so
// slug / read-time hooks recompute.
router.patch('/posts/:id', requireAuth, async (req, res, next) => {
    try {
        const post = await Blog.findById(req.params.id);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const merged = { ...post.toObject(), ...req.body };
        const [fields, error] = validateBody(merged);
        if (error) return res.status(400).json({ error });

        Object.assign(post, fields, { readTime: '' });
        await post.save();
        res.json(post);
    } catch (err) { next(err); }
});

// DELETE /api/posts/:id (auth required)
router.delete('/posts/:id', requireAuth, async (req, res, next) => {
    try {
        const post = await Blog.findByIdAndDelete(req.params.id);
        if (!post) return res.status(404).json({ error: 'Post not found' });
        res.json({ ok: true, deleted: post._id });
    } catch (err) { next(err); }
});

module.exports = router;
