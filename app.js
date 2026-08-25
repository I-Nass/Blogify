require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const session = require('express-session');

const { connectDB } = require('./server/db/db');
const { seedAdminIfEmpty } = require('./scripts/seed');
const User = require('./models/user-model');
const { attachUser } = require('./middleware/auth');

const pageRoutes = require('./routes/page-routes');
const apiRoutes = require('./routes/api-routes');
const adminRoutes = require('./routes/admin-routes');
const helpers = require('./utils/helpers');

const app = express();
const port = process.env.PORT || 3000;

// --- global middleware -------------------------------------------------
// Security headers. CSP is relaxed for now because of inline handlers in
// templates — tighten (script-src 'self') before going to production.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan('dev'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

// static assets + views
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.locals.fmt = helpers;

// expose logged-in user to every template
app.use(attachUser(User));

// liveness probe (also reports DB connection state)
app.get('/healthz', (req, res) => {
    res.json({ ok: true, db: require('mongoose').connection.readyState }); // 1 = connected
});

// --- routes -------------------------------------------------------------
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);
app.use('/', pageRoutes);

// --- 404 ----------------------------------------------------------------
app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
    res.status(404).render('error', {
        title: 'Page not found · Blogify',
        code: 404,
        message: 'The page you are looking for does not exist or was moved.',
    });
});

// --- central error handler ----------------------------------------------
app.use((err, req, res, next) => {
    let status = err.status || 500;
    let message = err.message || 'Unexpected server error';
    if (err.name === 'CastError') { status = 400; message = 'Invalid identifier'; }
    if (err.name === 'ValidationError') { status = 400; message = Object.values(err.errors).map(e => e.message).join(', '); }
    console.error(`[error ${status}] ${message}`);
    if (req.path.startsWith('/api/')) return res.status(status).json({ error: message });
    res.status(status).render('error', {
        title: `${status} · Blogify`,
        code: status,
        message: status >= 500 ? 'Something went wrong on our side. Please try again later.' : message,
    });
});

// --- boot: connect DB first, then listen --------------------------------
(async () => {
    try {
        await connectDB();
        await seedAdminIfEmpty();
        app.listen(port, () => console.log(`Blogify running at http://localhost:${port}`));
    } catch (err) {
        console.error('[boot] startup failed:', err.message);
        process.exit(1);
    }
})();
