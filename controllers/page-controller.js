const Blog = require('../models/blog-model');

const PAGE_SIZE = 6;

/* ---------- pagination helper ---------- */
function pageList(page, totalPages) {
    if (totalPages <= 9) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const near = [page - 1, page, page + 1].filter(n => n >= 1 && n <= totalPages);
    const set = [...new Set([1, 2, totalPages - 1, totalPages, ...near])]
        .filter(n => n >= 1 && n <= totalPages)
        .sort((a, b) => a - b);
    const out = [];
    let prev = 0;
    for (const n of set) {
        if (prev && n - prev > 1) out.push('…');
        out.push(n);
        prev = n;
    }
    return out;
}

function buildPager(basePath, params, page, totalPages, total) {
    const mk = p => {
        const us = new URLSearchParams(params);
        us.set('page', String(p));
        return `${basePath}?${us.toString()}`;
    };
    const items = pageList(page, totalPages).map(x =>
        typeof x === 'number' ? { n: x, url: mk(x), current: x === page } : { dots: true }
    );
    return {
        currentPage: page,
        totalPages,
        totalItems: total,
        prevUrl: page > 1 ? mk(page - 1) : null,
        nextUrl: page < totalPages ? mk(page + 1) : null,
        items,
    };
}

/* ---------- shared list renderer (home / search / tag / category / author) ---------- */
async function renderList(req, res, { filter, heading = null, emptyMessage }) {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const params = { ...req.query };
    delete params.page;

    const [posts, total] = await Promise.all([
        Blog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
        Blog.countDocuments(filter),
    ]);

    res.render('index', {
        title: heading ? `${heading} · Blogify` : 'Blogify — stories worth reading',
        metaDescription: heading || 'Latest stories from Blogify.',
        heading,
        hero: !heading,
        posts,
        pager: buildPager(req.path, params, page, Math.ceil(total / PAGE_SIZE) || 1, total),
        emptyMessage,
        q: req.query.q || '',
    });
}

const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/* ---------- controllers ---------- */

exports.home = async (req, res, next) => {
    try {
        await renderList(req, res, { filter: { status: { $ne: 'draft' } } });
    } catch (err) { next(err); }
};

exports.search = async (req, res, next) => {
    try {
        const q = String(req.query.q || '').trim();
        if (!q) return res.redirect('/');
        const filter = { status: { $ne: 'draft' }, ...Blog.searchFilter(q) };
        await renderList(req, res, {
            filter,
            heading: `Search results for “${q}”`,
            emptyMessage: `No articles matched “${q}”. Try different keywords.`,
        });
    } catch (err) { next(err); }
};

exports.byTag = async (req, res, next) => {
    try {
        const tag = String(req.params.tag || '').toLowerCase();
        await renderList(req, res, {
            filter: { status: { $ne: 'draft' }, tags: tag },
            heading: `Posts tagged “#${tag}”`,
            emptyMessage: 'No posts carry this tag yet.',
        });
    } catch (err) { next(err); }
};

exports.byCategory = async (req, res, next) => {
    try {
        const category = String(req.params.category || '').toLowerCase();
        await renderList(req, res, {
            filter: { status: { $ne: 'draft' }, category },
            heading: `${cap(category)} stories`,
            emptyMessage: 'Nothing published in this category yet.',
        });
    } catch (err) { next(err); }
};

exports.byAuthor = async (req, res, next) => {
    try {
        const author = String(req.params.author || '').trim();
        const rx = new RegExp(`^${require('../utils/helpers').escapeRegExp(author)}$`, 'i');
        await renderList(req, res, {
            filter: { status: { $ne: 'draft' }, author: rx },
            heading: `Stories by ${author}`,
            emptyMessage: 'This author has not published anything yet.',
        });
    } catch (err) { next(err); }
};

// Tag cloud page
exports.tagsPage = async (req, res, next) => {
    try {
        const tags = await Blog.aggregate([
            { $match: { status: { $ne: 'draft' } } },
            { $unwind: '$tags' },
            { $group: { _id: '$tags', count: { $sum: 1 } } },
            { $sort: { count: -1, _id: 1 } },
        ]);
        res.render('tags', {
            title: `Tags · Blogify`,
            tags,
            emptyMessage: 'No tags yet — add some to your posts in the admin panel.',
        });
    } catch (err) { next(err); }
};

// Single post page (id or slug). Drafts are visible only when logged in.
exports.readPost = async (req, res, next) => {
    try {
        const post = await Blog.findByIdOrSlug(req.params.id).lean();
        const isDraftHidden = post && post.status === 'draft' && !res.locals.currentUser;
        if (!post || isDraftHidden) {
            return res.status(404).render('error', {
                title: 'Post not found · Blogify',
                code: 404,
                message: 'This post does not exist or has been unpublished.',
            });
        }
        res.render('read', {
            title: `${post.title} · Blogify`,
            metaDescription: post.summary,
            post,
        });
    } catch (err) { next(err); }
};
