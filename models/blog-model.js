const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    title:     { type: String, required: true, trim: true, maxlength: 200 },
    slug:      { type: String, unique: true, index: true },
    summary:   { type: String, required: true, trim: true, maxlength: 500 },
    imgUrl:    { type: String, trim: true, default: '/img/Image_not_available.png' },
    imgUrl2:   { type: String, trim: true, default: '' },
    article1:  { type: String, default: '' },
    article2:  { type: String, default: '' },
    author:    { type: String, required: true, trim: true, maxlength: 80 },
    category:  { type: String, trim: true, lowercase: true, default: 'general' },
    tags:      { type: [String], default: [] },
    status:    { type: String, enum: ['draft', 'published'], default: 'published', index: true },
    readTime:  { type: String, default: '' },
}, { timestamps: true });

// Auto slug (unique) + auto read time, computed on every save.
blogSchema.pre('validate', async function () {
    if (this.title && (this.isModified('title') || !this.slug)) {
        const base = require('../utils/helpers').slugify(this.title);
        let slug = base, i = 2;
        while (await this.constructor.exists({ slug, _id: { $ne: this._id } })) {
            slug = `${base}-${i++}`;
        }
        this.slug = slug;
    }
    if (!this.readTime) {
        this.readTime = require('../utils/helpers').calcReadTime(this.article1, this.article2);
    }
});

// Text search helper used by the search route (regex-based, fine at blog scale).
blogSchema.statics.searchFilter = function (q) {
    const rx = new RegExp(require('../utils/helpers').escapeRegExp(q), 'i');
    return { $or: [{ title: rx }, { summary: rx }, { article1: rx }, { article2: rx }, { author: rx }, { tags: rx }] };
};

// Find a post by Mongo id OR by slug.
blogSchema.statics.findByIdOrSlug = function (value) {
    const { isValidObjectId } = require('mongoose');
    const clauses = isValidObjectId(value) ? [{ _id: value }, { slug: value }] : [{ slug: value }];
    return this.findOne({ $or: clauses });
};

// Third argument keeps compatibility with the original "blogdatas" collection,
// so pre-existing posts keep showing up (missing slugs/tags simply fall back).
module.exports = mongoose.model('Blog', blogSchema, 'blogdatas');
