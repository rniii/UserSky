/*
 * UserSky, a client modification for Bluesky
 * Copyright (c) 2026 rini and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import htm from "htm";

import { withErrorBoundary } from "./components/ErrorBoundary.ts";
import type { PluginDecl } from "./types.ts";
import { Logger } from "./utils/logger.ts";
import { React } from "./webpack/common.ts";
import { addPatch, findByPropsLazy, ModuleFinds, patchWebpack } from "./webpack/index.ts";

export * as Utils from "./utils/index.ts";
export * as Webpack from "./webpack/index.ts";

const logger = new Logger("Main");

export const Plugins: Record<string, PluginDecl> = {};

export function declarePlugin<T extends PluginDecl>(plugin: T & Record<string, any>) {
    if (plugin.name in Plugins) {
        logger.warn(`Conflicting plugin name: ${plugin.name}`);
    }

    for (const patch of plugin.patches ?? []) {
        const pluginPath = `UserSky.Plugins[${JSON.stringify(plugin.name)}]`;

        const find = Array.isArray(patch.find) ? patch.find : [patch.find];
        const replacement = (Array.isArray(patch.replacement) ? patch.replacement : [patch.replacement])
            .map(({ match, replace }) => {
                if (typeof replace == "string") {
                    replace = replace.replace("$self", pluginPath);
                }

                return { match, replace };
            });

        addPatch({
            plugin: plugin.name,
            find,
            replacement,
        });
    }

    return Plugins[plugin.name] = plugin;
}

export function re(template: TemplateStringsArray) {
    const special: Record<string, string> = {
        i: "[A-Za-z_$][\\w_$]*",
        I: "[A-Za-z_$][\\w_$]*(\\.[A-Za-z_$][\\w_$]*)?",
    };

    const raw = String.raw(template);
    const flags = raw.match(/^\(\?([a-z]+)\)/);
    const regex = new RegExp(
        raw
            .slice(flags?.[0].length)
            .replace(/\\*[.*+?^${([\])}|]/g, m => m.length % 2 ? "\\" + m : m.slice(1))
            .replace(/\\*[iI]/g, m => m.length % 2 ? m : special[m[m.length - 1]]),
        flags?.[1],
    );

    return Object.defineProperties(regex, {
        toString: { value: () => "re`" + raw + "`" },
    });
}

export const html = htm.bind(React.createElement);

const { useTheme } = findByPropsLazy("useAlf", "useTheme");
const { Text } = findByPropsLazy("Span", "Text", "H1");

declarePlugin({
    name: "Core",
    patches: [{
        find: ModuleFinds.Navigator,
        replacement: [
            {
                match: re`\(\i\)=!\i&&\i&&(0,\i.jsx)(\I,{style:[\I.w_full,{height:32}],\.\{100,300\}children:[\(\i,\)\{3,\}\1\(\?=]\)`,
                replace: "$&,$self.renderNavFooter()",
            },
        ],
    }],

    renderNavFooter: withErrorBoundary(() => {
        const t = useTheme();

        return html`<${React.Fragment}>
            <${Text} style=${[t.atoms.text_contrast_medium]}>
                UserSky
            <//>
            <${Text} style=${[{ color: t.palette.yellow }]}>
                AAhhh!! warning!!!!!!!!!!!!
            <//>
        <//>`;
    }),
});

if ("location" in globalThis && new URLSearchParams(location.search).get("vanilla")) {
    throw "nevermind";
}

patchWebpack();
