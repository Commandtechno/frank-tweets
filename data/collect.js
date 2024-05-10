import { readFile, readdir, writeFile } from "fs/promises";
import { load } from "cheerio";
import { resolve } from "path";

const allTweets = new Map();

const files = [
  ...(await readdir(resolve("snapshots", "frank_ocean"), { recursive: true, withFileTypes: true })),
  ...(await readdir(resolve("snapshots", "lonnybreauxjr"), { recursive: true, withFileTypes: true }))
];

for (const file of files) {
  if (!file.isFile()) continue;
  const html = await readFile(resolve(file.path, file.name), "utf8");
  const $ = load(html);
  const tweets = [
    ...$(`.u-frank_ocean[id^=status_], .u-lonnybreauxjr[id^=status_]`)
      .toArray()
      .map(el => {
        const $el = $(el);
        return { id: $el.attr("id").slice("status_".length), text: $el.find(".entry-content").text().trim() };
      }),
    ...$('[data-user-id="20555438"][data-tweet-id]')
      .toArray()
      .map(el => {
        const $el = $(el);
        return { id: $el.attr("data-tweet-id"), text: $el.find(".js-tweet-text, .tweet-text").first().text().trim() };
      })
  ];

  for (const tweet of tweets) {
    if (allTweets.has(tweet.id)) continue;
    allTweets.set(tweet.id, tweet.text);
  }
}

const rss = await readdir(resolve("snapshots", "statuses"), { recursive: true, withFileTypes: true });

for (const file of rss) {
  if (!file.isFile()) continue;
  const xml = await readFile(resolve(file.path, file.name), "utf8");
  const $ = load(xml, { xmlMode: true });
  const tweets = $("item")
    .toArray()
    .map(el => {
      const $el = $(el);
      return { id: $el.find("guid").text().split("/").pop(), text: $el.find("description").text() };
    })
    .filter(tweet => tweet.text.startsWith("frank_ocean: "))
    .map(tweet => ({ id: tweet.id, text: tweet.text.slice("frank_ocean: ".length) }));

  for (const tweet of tweets) {
    if (allTweets.has(tweet.id)) continue;
    allTweets.set(tweet.id, tweet.text);
  }
}

await writeFile(
  "allTweets.json",
  JSON.stringify(
    [...allTweets].sort(([a], [b]) => Number(BigInt(b) - BigInt(a))),
    null,
    2
  )
);
