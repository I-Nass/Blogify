const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/admin-controller');
const { requireAuth } = require('../middleware/auth');

// Public (login)
router.get('/login', ctrl.loginPage);
router.post('/login', ctrl.login);

// Everything below requires a session
router.use(requireAuth);

router.post('/logout', ctrl.logout);
router.get('/', ctrl.dashboard);
router.get('/new', ctrl.newForm);
router.post('/new', ctrl.create);
router.get('/edit/:id', ctrl.editForm);
router.post('/edit/:id', ctrl.update);
router.post('/delete/:id', ctrl.destroy);

module.exports = router;
