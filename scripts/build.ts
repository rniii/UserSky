/*
 * UserSky, a client modification for Bluesky
 * Copyright (c) 2025 rini and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { build, type BuildOptions, context } from "esbuild";

const watch = process.argv.includes("--watch") || process.argv.includes("-w");

function userscriptBanner(meta: Record<string, string | string[]>) {
    const normalized = [] as [string, string][];

    for (const prop in meta) {
        const values = Array.isArray(meta[prop]) ? meta[prop] : [meta[prop]];
        const key = prop.replace(/[A-Z]/g, c => "-" + c.toLowerCase());

        for (const value of values) normalized.push([key, value]);
    }

    const width = normalized.reduce((max, [key]) => key.length > max ? key.length : max, 0);

    return [
        "// ==UserScript==",
        ...normalized.map(([k, v]) => `// @${k.padEnd(width)} ${v}`),
        "// ==/UserScript==",
    ].join("\n");
}

const banner = userscriptBanner({
    name: "UserSky",
    match: [
        "https://bsky.app/*",
        // "https://deer.social/*", FIXME older build with less module splitting. sad for snitching modules
        "https://blacksky.community/*",
        "https://witchsky.app/*",
        "https://*.bsky.dev/*",
    ],
    runAt: "document-start",
    grant: "none",
});

const options: BuildOptions = {
    bundle: true,
    entryPoints: ["src/UserSky.ts"],
    banner: { js: banner },
    outfile: "dist/UserSky.user.js",
    jsx: "automatic",
    minifySyntax: true,
    sourcemap: "linked",
};

if (watch) {
    await context(options).then(ctx => ctx.watch());
} else {
    await build(options);
}
