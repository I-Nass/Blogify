const bcrypt = require('bcryptjs');
const Blog = require('../models/blog-model');
const User = require('../models/user-model');
const { pickBlogFields } = require('../utils/helpers');

const FLASH = {
    created: '✓ Post created successfully.',
    updated: '✓ Post updated successfully.',
    deleted: '✓ Post deleted.',
};

/* ---------- auth ---------- */

exports.loginPage = (req, res) => {
    if (res.locals.currentUser) return res.redirect('/admin');
    res.render('admin/login', { title: 'Admin login · Blogify', error: null });
};

exports.login = async (req, res, next) => {
    try {
        const username = String((req.body && req.body.username) || '').trim();
        const password = String((req.body && req.body.password) || '');
        const user = await User.findOne({ username }).maxTimeMS(5000);
        // Dummy compare keeps timing consistent for unknown users
        const ok = user && bcrypt.compareSync(password, user.passwordHash || '');
        if (!ok) {
            return res.status(401).render('admin/login', {
                title: 'Admin login · Blogify',
                error: 'Invalid username or password.',
            });
        }
        req.session.userId = user._id.toString();
        res.redirect('/admin');
    } catch (err) { next(err); }
};

exports.logout = (req, res) => {
    req.session.destroy(() => res.redirect('/'));
};

/* ---------- dashboard ---------- */

exports.dashboard = async (req, res, next) => {
    try {
        const [posts, total, published, drafts] = await Promise.all([
            Blog.find().sort({ createdAt: -1 }).lean(),
            Blog.countDocuments({}),
            Blog.countDocuments({ status: 'published' }),
            Blog.countDocuments({ status: 'draft' }),
        ]);
        res.render('admin/dashboard', {
            title: 'Dashboard · Admin · Blogify',
            posts,
            stats: { total, published, drafts },
            msg: FLASH[req.query.msg] || null,
        });
    } catch (err) { next(err); }
};

/* ---------- create ---------- */

exports.newForm = (req, res) => {
    res.render('admin/editor', {
        title: 'New post · Admin · Blogify',
        post: null,
        isEdit: false,
        error: null,
    });
};

exports.create = async (req, res, next) => {
    try {
        const fields = pickBlogFields(req.body);
        if (!fields.title || !fields.summary || !fields.author) {
            return res.status(400).render('admin/editor', {
                title: 'New post · Admin · Blogify',
                post: req.body,
                isEdit: false,
                error: 'Title, summary and author are required.',
            });
        }
        await Blog.create(fields);
        res.redirect('/admin?msg=created');
    } catch (err) {
        if (err.name === 'ValidationError') {
            return res.status(400).render('admin/editor', {
                title: 'New post · Admin · Blogify',
                post: req.body,
                isEdit: false,
                error: Object.values(err.errors).map(e => e.message).join(', '),
            });
        }
        next(err);
    }
};

/* ---------- edit / update / delete ---------- */

exports.editForm = async (req, res, next) => {
    try {
        const post = await Blog.findById(req.params.id).lean();
        if (!post) return res.redirect('/admin?msg=missing');
        res.render('admin/editor', {
            title: `Edit “${post.title}” · Admin · Blogify`,
            post,
            isEdit: true,
            error: null,
        });
    } catch (err) { next(err); }
};

// Load → assign → save() so model hooks (slug + read time recompute) run.
exports.update = async (req, res, next) => {
    try {
        const post = await Blog.findById(req.params.id);
        if (!post) return res.redirect('/admin?msg=missing');

        const fields = pickBlogFields(req.body);
        if (!fields.title || !fields.summary || !fields.author) {
            return res.status(400).render('admin/editor', {
                title: `Edit post · Admin · Blogify`,
                post: { ...post.toObject(), ...req.body, _id: post._id },
                isEdit: true,
                error: 'Title, summary and author are required.',
            });
        }

        Object.assign(post, fields, { readTime: '' }); // readTime recomputed by hook
        await post.save();
        res.redirect('/admin?msg=updated');
    } catch (err) {
        if (err.name === 'ValidationError') {
            return res.status(400).render('admin/editor', {
                title: `Edit post · Admin · Blogify`,
                post: { ...req.body, _id: req.params.id },
                isEdit: true,
                error: Object.values(err.errors).map(e => e.message).join(', '),
            });
        }
        next(err);
    }
};

exports.destroy = async (req, res, next) => {
    try {
        await Blog.findByIdAndDelete(req.params.id);
        res.redirect('/admin?msg=deleted');
    } catch (err) { next(err); }
};
