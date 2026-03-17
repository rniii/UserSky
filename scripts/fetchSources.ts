/*
 * UserSky, a client modification for Bluesky
 * Copyright (c) 2025 rini and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import fs from "node:fs/promises";

const MAIN_RE = RegExp('"(https://web-cdn.bsky.app/static/js/main.\\w+.js)"');

const html = await fetch("https://bsky.app").then(r => r.text());
const [, script] = html.match(MAIN_RE) ?? [];
const js = await fetch(script).then(r => r.text());

await fs.rm("dist/bsky", { recursive: true, force: true });
await fs.mkdir("dist/bsky", { recursive: true });
await fs.writeFile("dist/bsky/main.js", js);
