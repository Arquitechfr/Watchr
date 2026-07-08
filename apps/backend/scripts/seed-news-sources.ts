import { connectDatabase } from "../src/lib/database.js";
import { NewsSource, type NewsLocale } from "../src/models/newsSource.model.js";

const SEED_SOURCES: Array<{ id: string; name: string; url: string; locale: NewsLocale }> = [
  // Français
  { id: "allocine-news", name: "AlloCiné", url: "https://www.allocine.fr/rss/news.xml", locale: "fr" },
  { id: "allocine-movies", name: "AlloCiné Ciné", url: "https://www.allocine.fr/rss/news-cine.xml", locale: "fr" },
  { id: "allocine-series", name: "AlloCiné Séries", url: "https://www.allocine.fr/rss/news-series.xml", locale: "fr" },
  // English
  { id: "tvline", name: "TVLine", url: "https://tvline.com/feed", locale: "en" },
  { id: "screenrant", name: "ScreenRant", url: "https://screenrant.com/feed/", locale: "en" },
  { id: "variety-film", name: "Variety Film News", url: "http://feeds.feedburner.com/variety/news/film", locale: "en" },
  { id: "variety-tv", name: "Variety TV News", url: "http://feeds.feedburner.com/variety/news/tv", locale: "en" },
  { id: "deadline", name: "Deadline", url: "https://deadline.com/feed/", locale: "en" },
  // Spanish
  { id: "google-news-es", name: "Google News Entretenimiento", url: "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=es&gl=ES&ceid=ES:es", locale: "es" },
  // Portuguese
  { id: "google-news-pt", name: "Google News Entretenimento", url: "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=pt-BR&gl=BR&ceid=BR:pt-419", locale: "pt" },
  // German
  { id: "google-news-de", name: "Google News Unterhaltung", url: "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=de&gl=DE&ceid=DE:de", locale: "de" },
  // Italian
  { id: "google-news-it", name: "Google News Intrattenimento", url: "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=it&gl=IT&ceid=IT:it", locale: "it" },
  // Arabic
  { id: "ign-me-ar", name: "IGN Middle East", url: "https://me.ign.com/ar/feed.xml", locale: "ar" },
  { id: "google-news-ar", name: "Google News Entertainment", url: "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=ar&gl=EG&ceid=EG:ar", locale: "ar" },
];

async function seedNewsSources() {
  await connectDatabase();

  let created = 0;
  let updated = 0;

  for (const source of SEED_SOURCES) {
    const result = await NewsSource.findOneAndUpdate(
      { id: source.id },
      { $set: source },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      created++;
    } else {
      updated++;
    }
    console.log(`✓ ${source.id} (${source.locale}) — ${source.name}`);
  }

  console.log(`\nDone: ${created} created, ${updated} updated`);
  process.exit(0);
}

seedNewsSources().catch((err) => {
  console.error(err);
  process.exit(1);
});
