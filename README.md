# Blogify

A personal blog platform built with **Node.js + Express + MongoDB (Mongoose)** and **server-rendered EJS** templates, including an integrated lightweight CMS (admin panel).

## Quick start

```bash
npm install
copy .env.example .env      # then fill in MONGODB_URI
npm run seed                # optional: insert sample articles
npm run dev                 # http://localhost:3000
```

On first boot an admin account is auto-created from `ADMIN_USERNAME` / `ADMIN_PASSWORD` in your `.env` (defaults: `admin` / `ChangeMe123!` — **change these for any real deployment**).

## Routes

### Public pages
| Route | Description |
|---|---|
| `GET /` | Home — paginated published posts (6/page) |
| `GET /read/:idOrSlug` | Single post (drafts visible only when logged in) |
| `GET /search?q=term` | Full-text search across title/summary/body/tags/author |
| `GET /tags` | Tag cloud with post counts |
| `GET /tag/:tag` | Posts tagged with `:tag` |
| `GET /category/:category` | Posts in a category |
| `GET /author/:author` | Posts by author |

### Admin CMS (`/admin`)
| Route | Description |
|---|---|
| `GET /admin/login` · `POST /admin/login` | Session login (bcrypt) |
| `POST /admin/logout` | End session |
| `GET /admin` | Dashboard: stats + all posts table |
| `GET /admin/new` · `POST /admin/new` | Create post |
| `GET /admin/edit/:id` · `POST /admin/edit/:id` | Edit post |
| `POST /admin/delete/:id` | Delete post |

All admin write routes require a session.

### JSON API (`/api`, auth required for writes)
```
GET    /api/posts?page=&limit=&q=&tag=&category=&author=&status=
GET    /api/posts/:idOrSlug
POST   /api/posts            PATCH /api/posts/:id     DELETE /api/posts/:id
GET    /healthz              → { ok, db } connection probe
```

## Features
- Slug URLs (`/read/my-post-title`) with automatic uniqueness handling
- Auto-computed read time from word count
- Draft/published workflow with admin-only draft preview
- Server-side pagination with smart page windows
- Search with regex-injection escaping; tags & categories indexed by convention
- Central error handler (400/404/500 pages + JSON for `/api/*`), security headers (helmet), gzip compression, request logging (morgan)
- Field whitelisting on all writes (no mass assignment), EJS output escaping (XSS-safe)

## Project structure
```
app.js                  entry point (middleware, routes, error handling)
server/db/db.js         mongoose connection
models/                 blog-model.js, user-model.js
controllers/            page-controller, admin-controller
routes/                 page-routes, api-routes, admin-routes
middleware/auth.js      session guard + template user injection
views/                  EJS templates (public + admin)
utils/helpers.js        slugify, read time, field whitelisting…
scripts/seed.js         sample data seeding (npm run seed)
public/                 css / js / img
_legacy/                archived first-draft files (safe to delete)
```

## Notes & next steps
- Sessions use the in-memory store (fine for dev). For production add `connect-mongo`.
- Add CSRF protection before public deployment.
- Consider real image uploads (multer/cloudinary), RSS feed, sitemap.xml, Atlas Search indexes, rate limiting.
