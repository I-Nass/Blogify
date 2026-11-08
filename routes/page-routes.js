const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/page-controller');

// Public, server-rendered pages
router.get('/', ctrl.home);
router.get('/search', ctrl.search);
router.get('/tags', ctrl.tagsPage);
router.get('/tag/:tag', ctrl.byTag);
router.get('/category/:category', ctrl.byCategory);
router.get('/author/:author', ctrl.byAuthor);
router.get('/read/:id', ctrl.readPost);   // :id accepts a Mongo id OR a slug

// Alternate route paths & convenient aliases
router.get('/blog/:id', ctrl.readPost);
router.get('/blog/author/:author', ctrl.byAuthor);
router.get('/blog/author', (req, res) => res.redirect('/'));
router.get('/category', (req, res) => res.redirect('/tags'));
router.get('/category/tags', (req, res) => res.redirect('/tags'));
router.get('/categories', (req, res) => res.redirect('/tags'));
router.get('/my-account', (req, res) => res.redirect(req.session && req.session.userId ? '/admin' : '/admin/login'));
router.get('/account', (req, res) => res.redirect(req.session && req.session.userId ? '/admin' : '/admin/login'));
router.get('/login', (req, res) => res.redirect('/admin/login'));
router.get('/logout', (req, res) => res.redirect(307, '/admin/logout'));

module.exports = router;
