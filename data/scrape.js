import { mkdir, writeFile } from "fs/promises";
import { dirname, resolve } from "path";
import { existsSync } from "fs";
import filenamify from "filenamify";

async function getSnapshots(url) {
  const snapshots = await fetch(`https://web.archive.org/cdx/search/cdx?url=${url}&output=json&matchType=prefix`).then(
    res => res.json()
  );

  const headers = snapshots.shift();
  return snapshots.map(row =>
    row.reduce((acc, val, i) => {
      acc[headers[i]] = val;
      return acc;
    }, {})
  );
}

const snapshots = [
  ...(await getSnapshots("https://twitter.com/frank_ocean")),
  ...(await getSnapshots("https://twitter.com/lonnybreauxjr")),
  ...(await getSnapshots("http://twitter.com/statuses/user_timeline/20555438.rss"))
];

for (const snapshot of snapshots) {
  if (
    BigInt(snapshot.timestamp) > 20130807185709n ||
    snapshot.original.toLowerCase().includes("twitter.com/frank_ocean_")
  )
    continue;

  console.log(snapshot);
  const path = resolve(
    "snapshots",
    ...snapshot.urlkey.split("/").slice(1).map(filenamify),
    snapshot.timestamp + ".html"
  );

  if (existsSync(path)) continue;
  await mkdir(dirname(path), { recursive: true });

  const url = `https://web.archive.org/web/${snapshot.timestamp}id_/${snapshot.original}`;
  const html = await fetch(url).then(res => res.text());
  await writeFile(path, html);
}
