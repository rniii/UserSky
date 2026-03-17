/*
 * UserSky, a client modification for Bluesky
 * Copyright (c) 2026 rini and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Replacement, WebpackFactory, WebpackRequire } from "../types.ts";
import { makeLazyProxy } from "../utils/lazy.ts";
import { Logger } from "../utils/logger.ts";

const logger = new Logger("Webpack", "#8ed6fb");

export let wreq: WebpackRequire; // aka __webpack_require__

export const ModuleFinds = {
    // src/Navigation.tsx
    Navigator: ['.Screen,{name:"NotFound"'],
} satisfies Record<string, string[]>;

export function findModuleLazy(filter: (exports: any) => boolean) {
    return makeLazyProxy(() => {
        const cache = wreq.c;

        for (const moduleId in cache) {
            if (filter(cache[moduleId].exports)) {
                return cache[moduleId].exports;
            }
        }

        logger.warn("no results for filter", filter);
    });
}

export function findByPropsLazy(...properties: string[]) {
    const filter = (e: any) => e && typeof e == "object" && properties.every(p => Object.hasOwn(e, p));
    filter.properties = properties;

    return findModuleLazy(filter);
}

export type RawPatch = {
    find: string[];
    replacement: Replacement[];
    plugin: string;
    matched?: keyof any;
};

const patches: RawPatch[] = [];

export function addPatch(patch: RawPatch) {
    patches.push(patch);
}

function hookProperty(obj: any, prop: keyof any, desc: PropertyDescriptor & ThisType<any>) {
    desc.configurable = true;
    Object.defineProperty(obj, prop, desc);

    return () => Reflect.deleteProperty(obj, prop);
}

export async function patchWebpack() {
    const { promise, resolve } = Promise.withResolvers<void>();

    const unhookM = hookProperty(Function.prototype, "m", {
        set(factories) {
            logger.debug("read if cute", factories);

            unhookM();

            for (const moduleId in factories) patchFactory(factories, moduleId, factories[moduleId]);

            this.m = new Proxy(factories, { set: handleNewFactory });

            let cache: any;
            const cacheYoink = Symbol();
            const unhookC = hookProperty(Object.prototype, cacheYoink, {
                get() {
                    // eslint-disable-next-line
                    cache = this;
                    return { exports: {} };
                },
                set() {},
            });

            this(cacheYoink);

            unhookC();
            if (cache) delete cache[cacheYoink];

            // Object.setPrototypeOf(cache, new Proxy({}, { set: handleSetCache }));

            this.c = cache; // *exports your internal*

            // eslint-disable-next-line
            wreq = this;
            resolve();
        },
    });

    return promise;
}

function handleNewFactory(
    factories: WebpackRequire["m"],
    moduleId: keyof any,
    newFactory: WebpackFactory,
    receiver: any,
) {
    if (patchFactory(factories, moduleId, newFactory)) {
        return true;
    }

    return Reflect.set(factories, moduleId, newFactory, receiver);
}

function patchFactory(
    factories: WebpackRequire["m"],
    moduleId: keyof any,
    factory: WebpackFactory,
    receiver: any = factories,
) {
    let code = Function.prototype.toString.call(factory);
    const pending = patches.filter(p => p.find.every(f => code.includes(f)));

    if (pending.length) {
        const patchedBy = pending.map(({ plugin }) => plugin).join(", ");

        logger.log(`Patching ${String(moduleId)} (${patchedBy})`);

        for (const patch of pending) {
            if (patch.matched) logger.warn(patch.plugin + ": find is not unique", patch.find);

            patch.matched = moduleId;

            for (const repl of patch.replacement) {
                const oldCode = code;
                // @ts-expect-error overloads suck
                code = code.replace(repl.match, repl.replace);

                if (oldCode === code) logger.warn(patch.plugin + ": patch had no effect", repl);
            }
        }

        try {
            factory = (0, eval)(
                `// Module ${String(moduleId)} - patched by ${patchedBy}\n`
                + `0,${code}\n`
                + `//# sourceURL=webpack://Webpack${String(moduleId)}`,
            );
        } catch (e) {
            logger.warn(e, { code });
        }

        return Reflect.set(factories, moduleId, factory, receiver);
    }

    return false;
}
