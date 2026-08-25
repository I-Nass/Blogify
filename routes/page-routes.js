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

module.exports = router;
