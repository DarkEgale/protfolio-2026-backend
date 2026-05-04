import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
//import {rateLimit} from 'express-rate-limit';
import adminroute from './Routes/adminroute.js';
import Blog from './Models/Blog.model.js';
import Project from './Models/Project.mode.js';
import { rejectDangerousKeys } from './Utils/validation.js';

const app = express();
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'https://www.mdshimul.me',
  'https://mdshimul.me',
  'http://www.mdshimul.me',
  'http://mdshimul.me',
];

const slugify = (value = '') =>
  value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
/*app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
}));*/
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
}));
app.use(express.json({ limit: '1mb', strict: true }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());
app.use(rejectDangerousKeys);
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.send('Hello from the backend!');
});

app.get('/sitemap.xml', async (_req, res) => {
  const siteUrl = (process.env.FRONTEND_URL || 'https://mdshimul.me').replace(/\/$/, '');
  const staticRoutes = ['/', '/about', '/services', '/projects', '/blogs', '/contact'];

  try {
    const [projects, blogs] = await Promise.all([
      Project.find({}, 'slug title updatedAt createdAt').lean(),
      Blog.find({}, 'slug title updatedAt createdAt').lean(),
    ]);

    const urls = [
      ...staticRoutes.map((path) => ({
        loc: `${siteUrl}${path}`,
        lastmod: new Date().toISOString(),
        changefreq: path === '/' ? 'weekly' : 'monthly',
        priority: path === '/' ? '1.0' : '0.8',
      })),
      ...projects.map((project) => ({
        loc: `${siteUrl}/projects/${project.slug || slugify(project.title)}`,
        lastmod: new Date(project.updatedAt || project.createdAt).toISOString(),
        changefreq: 'monthly',
        priority: '0.7',
      })),
      ...blogs.map((blog) => ({
        loc: `${siteUrl}/blogs/${blog.slug || slugify(blog.title)}`,
        lastmod: new Date(blog.updatedAt || blog.createdAt).toISOString(),
        changefreq: 'monthly',
        priority: '0.7',
      })),
    ].filter((item) => !item.loc.endsWith('/undefined'));

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map(
        (url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
      )
      .join('\n')}\n</urlset>`;

    res.type('application/xml').send(xml);
  } catch (error) {
    res.status(500).type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><error>${error.message}</error>`);
  }
});

app.use('/api', adminroute);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use((error, _req, res, _next) => {
  const statusCode = error.status || error.statusCode || 500;
  const isClientError = statusCode >= 400 && statusCode < 500;

  res.status(statusCode).json({
    success: false,
    message: isClientError ? error.message : 'Internal Server Error',
  });
});

export default app;
