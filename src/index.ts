/*
 * UserSky, a client modification for Bluesky
 * Copyright (c) 2026 rini and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./webpack.ts";

import htm from "htm";

import { withErrorBoundary } from "./components/ErrorBoundary.ts";
import { React } from "./modules.ts";
import type { PluginDecl } from "./types.ts";
import { Logger } from "./utils/logger.ts";
import { useLogCounts } from "./utils/loggerHook.ts";
import { addPatch, findByPropsLazy, patchWebpack } from "./webpack.ts";

export * as Bluesky from "./bluesky.ts";
export * as Components from "./components/index.ts";
export * as Modules from "./modules.ts";
export * as Utils from "./utils/index.ts";
export * as Webpack from "./webpack.ts";

const logger = new Logger("Main");

export const Plugins: Record<string, PluginDecl> = {};

export function declarePlugin<T extends PluginDecl>(plugin: T) {
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

/**
 * Inverted-escape regex template tag. Like `/normal/` but escapes are flipped:
 * special regex chars are literal by default, and `\` makes them regex-active.
 *
 * - Unescaped `. * + ? ^ $ { ( [ ] ) } |` → **literal** in the regex
 * - Escaped (`\.` `\+` `\(` `\[` etc) → **regex meaning** (inverted from normal)
 * - `\i` → `[A-Za-z_$][\w_$]*` (identifier)
 * - `\I` → `[A-Za-z_$][\w_$]*(\.[A-Za-z_$][\w_$]*)?` (dotted property path, one level)
 * - `\\i` → unchanged (stays as `\\i` in the regex — literal backslash + i)
 * - Other escapes like `\d` `\w` `\s` pass through as normal regex
 * - `(?flags)` at the start sets regex flags
 *
 * @example
 * re`foo.bar`     // /foo\.bar/ — dot is literal
 * re`foo\.bar`    // /foo.bar/ — dot is regex (any char)
 * re`\i\(\i\)`    // identifier then literal ( then identifier then literal )
 * re`\(\i\)`      // capturing group around identifier
 * re`\i??`        // identifier then two literal ? (JS nullish coalescing)
 * re`(?g)\i`      // identifier with global flag
 */
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
        find: ["routeName:", "hasSession:", ".useGutters"],
        replacement: {
            match: re`\(\i\)=!\i&&\i&&(0,\i.jsx)(\I,{style:[\I.w_full,{height:32}],\.\{100,300\}children:[\(\i,\)\{3,\}\1\(\?=]\)`,
            replace: "$&,$self.renderNavFooter()",
        },
    }],

    renderNavFooter: withErrorBoundary(() => {
        const t = useTheme();
        const { errors, warnings } = useLogCounts();

        return html`<${React.Fragment}>
            <${Text} style=${[t.atoms.text_contrast_medium]}>
                UserSky
            <//>
            ${errors || warnings
                ? html`<${Text} style=${[{ color: errors ? t.palette.negative_400 : t.palette.yellow }]}>
                    ${errors && `${errors} error(s) and `}${warnings} warning(s) in console
                <//>`
                : null}
        <//>`;
    }),
});

declarePlugin({
    name: "UploadDirect",
    description: "Don't JPEG my images!!!!!!!!!!!!!!!!!!!!!!!!",

    patches: [
        {
            find: '"Failed to crop image"', // state/gallery.ts
            replacement: {
                match: re`\(\i\)=\i.transformed||\i.source;`,
                replace: "$&return $1;",
            },
        },
    ],
});

declarePlugin({
    name: "CircleAvatars",
    description: "Square avatars everywhere? Circle avatars everywhere!",

    patches: [
        {
            find: ["UserAvatar:()=>", "usePlainRNImage:"], // UserAvatar.tsx
            replacement: {
                match: re`(?g)\i??("user"===\i?"circle":"square")`,
                replace: '"circle"',
            },
        },
        {
            find: ['"userBannerImage"', '"profileHeaderBackBtn"'], // screens/Profile/Header/Shell.tsx
            replacement: [
                {
                    match: re`\i.associated?.labeler?"rect-avi":"circle-avi"`,
                    replace: '"circle-avi"',
                },
                {
                    match: re`\i.associated?.labeler&&\I.rounded_md`,
                    replace: "!1",
                },
            ],
        },
    ],
});

if ("location" in globalThis && new URLSearchParams(location.search).get("vanilla") != null) {
    throw "nevermind";
}

patchWebpack();
