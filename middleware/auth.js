const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) return next();
    // originalUrl keeps the mount prefix (/api/...) even inside routers
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    return res.redirect('/admin/login');
};

// Makes the logged-in user available to every template as `currentUser`
const attachUser = (User) => async (req, res, next) => {
    res.locals.currentUser = null;
    res.locals.currentPath = req.path;
    if (req.session && req.session.userId) {
        try {
            const user = await User.findById(req.session.userId).lean();
            if (user) res.locals.currentUser = { id: user._id, username: user.username };
            else req.session.destroy(() => {});
        } catch (_) { /* ignore, treated as logged out */ }
    }
    next();
};

module.exports = { requireAuth, attachUser };
