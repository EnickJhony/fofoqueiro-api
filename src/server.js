require('dotenv').config();

const express = require('express');
const cors = require('cors');
const prisma = require('./prisma');

const app = express();
const port = process.env.PORT || 3333;

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'Bem vindo à API fofoqueiro.' });
});

app.get('/health', async (_req, res) => {
  try {
    // verifica conexão simples ao banco
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: true });
  } catch (error) {
    console.error('Health check error:', error.message || error);
    res.status(500).json({ ok: false, db: false });
  }
});

function parseDateRange(dateString) {
  // expects YYYY-MM-DD
  const parts = dateString.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [y, m, d] = parts;
  const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const end = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0));
  return { start, end };
}

function parsePositiveInt(value) {
  if (value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  return parsed;
}

function parsePageParams(query) {
  const page = parsePositiveInt(query.page);
  const limit = parsePositiveInt(query.limit);

  if (query.page !== undefined && page === null) {
    return { error: 'Parametro page invalido. Use um inteiro maior que 0.' };
  }

  if (query.limit !== undefined && limit === null) {
    return { error: 'Parametro limit invalido. Use um inteiro maior que 0.' };
  }

  return {
    page,
    limit: limit ? Math.min(200, limit) : 20
  };
}

function buildNewsWhere(query) {
  const where = {};

  if (query.title) {
    where.title = {
      contains: String(query.title),
      mode: 'insensitive'
    };
  }

  if (query.source_name) {
    where.source_name = String(query.source_name);
  }

  if (query.date) {
    const range = parseDateRange(String(query.date));
    if (!range) {
      return { error: 'Formato de data invalido. Use YYYY-MM-DD' };
    }
    where.published_at = { gte: range.start, lt: range.end };
  }

  return { where };
}

function buildPaginationMeta(page, limit, total) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  };
}

app.get('/api/news', async (req, res, next) => {
  try {
    const pagination = parsePageParams(req.query);
    if (pagination.error) {
      return res.status(400).json({ message: pagination.error });
    }

    const filters = buildNewsWhere(req.query);
    if (filters.error) {
      return res.status(400).json({ message: filters.error });
    }

    const where = filters.where;
    const orderBy = [{ published_at: 'desc' }, { id: 'desc' }];

    if (pagination.page === null) {
      const news = await prisma.news.findMany({
        where,
        orderBy,
        take: pagination.limit
      });

      return res.json(news);
    }

    const skip = (pagination.page - 1) * pagination.limit;
    const [total, news] = await Promise.all([
      prisma.news.count({ where }),
      prisma.news.findMany({
        where,
        orderBy,
        skip,
        take: pagination.limit
      })
    ]);

    res.json({
      data: news,
      pagination: buildPaginationMeta(pagination.page, pagination.limit, total)
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/portals', async (_req, res, next) => {
  try {
    const portals = await prisma.news.groupBy({
      by: ['source_name'],
      orderBy: {
        source_name: 'asc'
      }
    });

    res.json(portals.map((portal) => portal.source_name));
  } catch (error) {
    next(error);
  }
});

app.get('/api/news/today', async (req, res, next) => {
  try {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));

    const pagination = parsePageParams(req.query);
    if (pagination.error) {
      return res.status(400).json({ message: pagination.error });
    }

    const where = { published_at: { gte: start, lt: end } };
    const orderBy = [{ published_at: 'desc' }, { id: 'desc' }];

    if (pagination.page === null) {
      const news = await prisma.news.findMany({
        where,
        orderBy,
        take: pagination.limit
      });

      return res.json(news);
    }

    const skip = (pagination.page - 1) * pagination.limit;
    const [total, news] = await Promise.all([
      prisma.news.count({ where }),
      prisma.news.findMany({
        where,
        orderBy,
        skip,
        take: pagination.limit
      })
    ]);

    res.json({
      data: news,
      pagination: buildPaginationMeta(pagination.page, pagination.limit, total)
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/news/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'ID invalido.' });

    const item = await prisma.news.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ message: 'Noticia nao encontrada.' });
    res.json(item);
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ message: 'Erro interno no servidor.' });
});

app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});
