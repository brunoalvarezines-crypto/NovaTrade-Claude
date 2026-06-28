const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const OUT = path.join(__dirname, '..', 'data', 'noticias', 'latest.json');

async function fetchNews() {
  if (!process.env.NEWS_API_KEY) return; // sin clave, no hay feed de noticias
  try {
    const url = `https://newsapi.org/v2/everything?q=bitcoin&sortBy=publishedAt&language=es&apiKey=${process.env.NEWS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const articles = (data.articles || []).slice(0, 10).map((a) => ({
      title: a.title,
      source: a.source && a.source.name,
      publishedAt: a.publishedAt,
      url: a.url,
    }));
    fs.writeFileSync(OUT, JSON.stringify({ articles, ts: Date.now() }));
  } catch (err) {
    console.error('Error en feed de noticias:', err.message);
  }
}

function startNewsFeed() {
  fetchNews();
  setInterval(fetchNews, 60 * 1000); // cada minuto
}

module.exports = { startNewsFeed };
