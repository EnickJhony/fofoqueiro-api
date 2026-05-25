require('dotenv').config();

const express = require('express');
const cors = require('cors');
const prisma = require('./prisma');

const app = express();
const port = process.env.PORT || 3000;

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

app.get('/api/news', async (req, res, next) => {
  try {
    const { limit, date, source_name } = req.query;
    let take = 200;
    if (limit) {
      const parsed = Number(limit);
      if (!Number.isNaN(parsed) && parsed > 0) take = Math.min(200, parsed);
    }

    const where = {};

    if (source_name) {
      where.source_name = String(source_name);
    }

    if (date) {
      const range = parseDateRange(String(date));
      if (!range) return res.status(400).json({ message: 'Formato de data invalido. Use YYYY-MM-DD' });
      where.published_at = { gte: range.start, lt: range.end };
    }

    const news = await prisma.news.findMany({
      where,
      orderBy: { published_at: 'desc' },
      take
    });

    res.json(news);
  } catch (error) {
    next(error);
  }
});

app.get('/api/news/today', async (req, res, next) => {
  try {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));

    const news = await prisma.news.findMany({
      where: { published_at: { gte: start, lt: end } },
      orderBy: { published_at: 'desc' },
      take: 200
    });

    res.json(news);
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
