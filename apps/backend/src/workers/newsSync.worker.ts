/* eslint-disable no-console */
import { Queue, Worker } from "bullmq";
import { redisConnection } from "../config/env.js";
import { getNews, NEWS_SOURCES, NewsArticle } from "../services/news.service.js";
import { wsEvents } from "../lib/wsEvents.js";

export const newsSyncQueue = new Queue("news-sync", { connection: redisConnection });

export async function scheduleNewsSync(): Promise<void> {
  await newsSyncQueue.add(
    "syncNews",
    {},
    {
      repeat: { pattern: "*/30 * * * *" },
      jobId: "news-sync-cron",
    },
  );
}

const seenArticleUrls = new Set<string>();

export function createNewsSyncWorker(): Worker {
  return new Worker(
    "news-sync",
    async (job) => {
      if (job.name !== "syncNews") return;

      const newArticles: NewsArticle[] = [];

      for (const source of NEWS_SOURCES) {
        try {
          const articles = await getNews(source.id, 30);
          for (const article of articles) {
            if (article.link && !seenArticleUrls.has(article.link)) {
              seenArticleUrls.add(article.link);
              newArticles.push(article);
            }
          }
        } catch (err) {
          console.error(`News sync failed for source ${source.id}:`, err);
        }
      }

      if (newArticles.length > 0) {
        console.log(`News sync: ${newArticles.length} new articles`);
        wsEvents.emit("news:new", { articles: newArticles });
      }

      if (seenArticleUrls.size > 500) {
        const urlsArray = Array.from(seenArticleUrls);
        seenArticleUrls.clear();
        urlsArray.slice(-200).forEach((url) => seenArticleUrls.add(url));
      }
    },
    { connection: redisConnection, concurrency: 1 },
  );
}
