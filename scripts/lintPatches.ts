/*
 * UserSky, a client modification for Bluesky
 * Copyright (c) 2026 rini and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Importing index.ts registers all plugins via declarePlugin → addPatch
import "../src/index.ts";

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createContext, runInContext } from "node:vm";

import { re } from "../src/index.ts";
import type { WebpackFactory } from "../src/types.ts";
import { patches } from "../src/webpack.ts";

const blueskyDir = "bluesky";

function prepMainChunk(code: string): string {
    // Strip the bootstrap that loads chunk 6025 and starts the app.
    // Expose the require function so we can grab the factory map.
    return code.replace(
        re`var \i=\i.O(void 0,[\d\+],()=>\i(\d\+));\i=\i.O(\i)`,
        "self.__wreq=o",
    );
}

function createVmContext() {
    return createContext({
        console: {
            log: () => {},
            warn: (...args: any[]) => console.warn("[vm]", ...args),
            error: (...args: any[]) => console.error("[vm]", ...args),
        },
        setTimeout,
        setInterval,
        clearTimeout,
        clearInterval,
        // webpack runtime needs a document to detect publicPath
        document: {
            currentScript: { src: "https://bsky.app/static/main.js", tagName: "SCRIPT" },
            getElementsByTagName: () => [{ src: "https://bsky.app/static/main.js", tagName: "SCRIPT", getAttribute: () => null }],
            head: { appendChild: () => {} },
            createElement: () => ({ setAttribute: () => {}, src: "", charset: "" }),
        },
        location: { href: "https://bsky.app/", search: "" },
    });
}

async function extractFactories(chunkFile: string): Promise<Record<string, WebpackFactory>> {
    const code = await readFile(join(blueskyDir, chunkFile), "utf8");
    const ctx = createVmContext();

    runInContext("var self=this;", ctx);

    if (chunkFile.startsWith("main.")) {
        const prepped = prepMainChunk(code);
        runInContext(prepped, ctx);
        const wreq = (ctx as any).__wreq;
        if (!wreq) throw new Error("could not extract webpack require");
        return wreq.m;
    } else {
        runInContext(code, ctx);
        const chunks = (ctx as any).webpackChunkweb ?? [];
        const factories: Record<string, WebpackFactory> = {};
        for (const entry of chunks) {
            const [, factoryMap] = entry;
            Object.assign(factories, factoryMap);
        }
        return factories;
    }
}

function checkFactory(moduleId: string, factory: WebpackFactory) {
    let code = Function.prototype.toString.call(factory);
    const pending = patches.filter(p => p.find.every(f => code.includes(f)));

    if (!pending.length) return { matched: false };

    const plugins = pending.map(p => p.plugin).join(", ");

    for (const patch of pending) {
        if (patch.matched) {
            // find is not unique — already matched another module
        }
        patch.matched = moduleId;

        for (const repl of patch.replacement) {
            const oldCode = code;
            // @ts-expect-error overloads suck
            code = code.replace(repl.match, repl.replace);
            if (oldCode === code) {
                return { matched: true, warning: `${patch.plugin}: patch had no effect` };
            }
        }
    }

    try {
        if (!/^function |^\(/.test(code)) code = "function" + code.slice(code.indexOf("("));
        (0, eval)(`0,${code}\n//# sourceURL=webpack://test/${moduleId}`);
    } catch (e: any) {
        return { matched: true, error: `${plugins}: ${e.message}` };
    }

    return { matched: true, plugin: plugins };
}

async function main() {
    const chunks = (await readdir(blueskyDir)).filter(f => f.endsWith(".js"));

    console.log(`Lint patches: ${chunks.length} chunks`);

    // Reset matched state
    for (const p of patches) delete p.matched;

    let totalModules = 0;
    let totalPatched = 0;
    let totalErrors = 0;
    let totalWarnings = 0;

    for (const chunkFile of chunks) {
        console.log(`\nChunk: ${chunkFile}`);

        let factories: Record<string, WebpackFactory>;
        try {
            factories = await extractFactories(chunkFile);
        } catch (e: any) {
            console.error(`  ✗ Failed to load: ${e.message}`);
            continue;
        }

        const ids = Object.keys(factories);
        console.log(`  ${ids.length} modules`);
        totalModules += ids.length;

        for (const id of ids) {
            const result = checkFactory(id, factories[id]);
            if (result.matched) {
                totalPatched++;
                if (result.error) {
                    totalErrors++;
                    console.error(`  ✗ Module ${id}: ${result.error}`);
                } else if (result.warning) {
                    totalWarnings++;
                    console.warn(`  ⚠ Module ${id}: ${result.warning}`);
                } else {
                    console.log(`  ✓ Module ${id} [${result.plugin}]`);
                }
            }
        }
    }

    console.log("\n--- Summary ---");
    console.log(`  ${totalModules} modules tested`);
    console.log(`  ${totalPatched} patches applied`);
    console.log(`  ${totalErrors} errors, ${totalWarnings} warnings`);

    const unmatched = patches.filter(p => !p.matched);
    if (unmatched.length) {
        console.log("  ⚠ Unmatched patches:");
        for (const p of unmatched) {
            console.log(`    - ${p.plugin}: ${p.find.join(", ")}`);
        }
    }

    const duplicate = patches.filter(p => p.matched && patches.filter(o => o.matched === p.matched).length > 1);
    if (duplicate.length) {
        console.log("  ⚠ Non-unique finds:");
        for (const p of duplicate) {
            console.log(`    - ${p.plugin}: matched ${String(p.matched)}`);
        }
    }

    process.exit(totalErrors > 0 ? 1 : 0);
}

main();
