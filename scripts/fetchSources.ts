/*
 * UserSky, a client modification for Bluesky
 * Copyright (c) 2025 rini and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import * as pathlib from "node:path";

console.log("Fetching https://bsky.app");

const html = await fetch("https://bsky.app").then(r => r.text());

await rm("dist/bsky", { recursive: true, force: true });
await mkdir("dist/bsky", { recursive: true });

await Promise.all(html.matchAll(/https:\/\/web-cdn\.bsky\.app\/[^"']*\.js/g).map(async ([url]) => {
    console.log(`Fetching ${url}`);

    const filename = pathlib.basename(url);
    const script = await fetch(url).then(r => r.text());

    await writeFile(pathlib.join("dist/bsky", filename), script);
}));
