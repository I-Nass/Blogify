// Small shared helpers used by controllers and EJS templates.

// Convert a title into a URL-safe slug, e.g. "Hello World!" -> "hello-world"
exports.slugify = (str = '') =>
    String(str)
        .toLowerCase()
        .replace(/['"]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'post';

// Escape user input before embedding it into a RegExp (prevents ReDoS/injection)
exports.escapeRegExp = (str = '') =>
    String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// "2026-08-25T..." -> "Aug 25, 2026"
exports.fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

// Split article text into paragraphs on blank lines (supports \n\n and \r\n\r\n)
exports.paragraphs = (text = '') =>
    String(text)
        .split(/\n\s*\n/)
        .map(p => p.replace(/\s*\n\s*/g, ' ').trim())
        .filter(Boolean);

// First N characters of text, cut on a word boundary, with ellipsis
exports.excerpt = (text = '', n = 160) => {
    const t = String(text).trim();
    return t.length <= n ? t : t.slice(0, n).replace(/\s+\S*$/, '') + '…';
};

// Word-count based read time, e.g. "4 min read"
exports.calcReadTime = (...parts) => {
    const words = parts.join(' ').trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200)) + ' min read';
};

// Whitelist + normalize incoming blog fields (blocks mass-assignment).
// Accepts tags as array or comma-separated string.
exports.pickBlogFields = (body = {}) => {
    const rawTags = Array.isArray(body.tags) ? body.tags.join(',') : (body.tags || '');
    const tags = String(rawTags)
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(Boolean)
        .filter((t, i, a) => a.indexOf(t) === i);

    return {
        title: String(body.title || '').trim(),
        summary: String(body.summary || '').trim(),
        imgUrl: String(body.imgUrl || '').trim(),
        imgUrl2: String(body.imgUrl2 || '').trim(),
        article1: String(body.article1 || ''),
        article2: String(body.article2 || ''),
        author: String(body.author || '').trim(),
        category: String(body.category || '').trim(),
        tags,
        status: body.status === 'draft' ? 'draft' : 'published',
    };
};
