/*
 * UserSky, a client modification for Bluesky
 * Copyright (c) 2026 rini and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { AnyFactory, MetroDeclare, MetroModule, Replacement, WebpackRequire } from "./types.ts";
import { makeLazyProxy } from "./utils/lazy.ts";
import { Logger } from "./utils/logger.ts";

const logger = new Logger("Patcher", "#8ed6fb");

type ModuleFilter<Exports = any> = (exports: Exports) => exports is Exports;

interface ModuleInfo<Exports = any> {
    id: keyof any;
    exports: Exports;
}

interface Bundler {
    require(moduleId: keyof any): any;
    findModule<E = any>(filter: ModuleFilter<E>): ModuleInfo<E> | null;
}

function explode(): never {
    throw Error("Bundler is not patched.");
}

export let implementation: Bundler & Record<string, any> = {
    require: explode,
    findModule: explode,
};

export function findModule<E>(filter: ModuleFilter<E>) {
    const mInfo = implementation.findModule(filter);

    return mInfo ? mInfo.exports : null;
}

export function findModuleByProps<K extends string>(...properties: K[]) {
    return findModule((e: any): e is Record<K, any> => (
        e && typeof e == "object" && properties.every(p => Object.hasOwn(e, p))
    ));
}

export function findModuleLazy(filter: ModuleFilter) {
    return makeLazyProxy(() => (
        findModule(filter) ?? void logger.warn("no results for filter", filter)
    ));
}

export function findByPropsLazy<K extends string>(...properties: K[]) {
    return makeLazyProxy(() => (
        findModuleByProps(...properties) ?? void logger.warn("no results for properties", properties)
    ));
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
    const original = Object.getOwnPropertyDescriptor(obj, prop);

    desc.configurable = true;
    Object.defineProperty(obj, prop, desc);

    return () => original ? Object.defineProperty(obj, prop, original) : delete obj[prop];
}

export async function patchBundler() {
    return new Promise<void>((resolve, reject) => {
        const unhookWebpack = hookWebpack(() => {
            logger.log("Using patched webpack bundler");

            unhookMetro();
            resolve();
        });
        const unhookMetro = hookMetro(() => {
            logger.log("Using patched metro bundler");

            unhookWebpack();
            resolve();
        });

        addEventListener("load", () => reject(new Error("no bundler patched :(")));
    });
}

function hookWebpack(resolve: () => void) {
    const unhookModules = hookProperty(Function.prototype, "m", {
        set(this: WebpackRequire, factories: WebpackRequire["m"]) {
            logger.debug("read if cute", factories);

            unhookModules();

            for (const moduleId in factories) {
                const patched = patchFactory(moduleId, factories[moduleId]);

                if (patched) factories[moduleId] = patched;
            }

            this.m = new Proxy(factories, { set: (factories, moduleId, newFactory, receiver) => {
                const factory = patchFactory(moduleId, newFactory) ?? newFactory;

                return Reflect.set(factories, moduleId, factory, receiver);
            } });

            let cache: any;
            const cacheYoink = Symbol();
            const unhookYoinker = hookProperty(Object.prototype, cacheYoink, {
                get() {
                    // eslint-disable-next-line
                    cache = this;
                    return { exports: {} };
                },
                set() {},
            });

            this(cacheYoink);

            unhookYoinker();
            if (cache) delete cache[cacheYoink];

            this.c = cache; // *exports your internal*

            implementation = {
                factories, cache, require: this,

                findModule(filter) {
                    for (const id in cache) {
                        const exports = cache[id].exports;

                        if (filter(exports)) return { id, exports };
                    }

                    return null;
                },
            };

            resolve();
        },
    });

    return unhookModules;
}

function hookMetro(resolve: () => void) {
    let metroModules: Map<keyof any, MetroModule>;

    const unhookDefine = hookProperty(globalThis, "__d", {
        set(declare: MetroDeclare) {
            unhookDefine();

            implementation = {
                modules: metroModules,
                require: this.__r,

                findModule(filter) {
                    for (const [id, mInfo] of metroModules.entries()) {
                        const exports = mInfo.publicModule?.exports;

                        if (filter(exports)) return { id, exports };
                    }

                    return null;
                },
            };

            const unhookClear = hookProperty(globalThis, "__c", {
                set(clear: () => typeof metroModules) {
                    unhookClear();

                    this.__c = function () {
                        return metroModules = clear.call(this);
                    };
                },
            });

            this.__d = function (this: any, factory, id, dependencyMap) {
                // @ts-expect-error blehh
                if (!metroModules) __c();

                factory = patchFactory(id, factory) ?? factory;

                declare.call(this, factory, id, dependencyMap);
            } satisfies MetroDeclare;

            resolve();
        },
    });

    return unhookDefine;
}

function patchFactory<F extends AnyFactory>(moduleId: keyof any, factory: F): F | undefined {
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

                if (oldCode === code) {
                    logger.warn(`${patch.plugin}: patch had no effect\n`
                        + `\tmatch: ${repl.match}\n`
                        + `\treplace: ${repl.replace}`);
                }
            }
        }

        try {
            // `80085(e, t, n)` -> `function(e, t, n)`
            if (!/^function |^\(/.test(code)) code = "function" + code.slice(code.indexOf("("));

            return (0, eval)(
                `// Module ${String(moduleId)} - patched by ${patchedBy}\n`
                + `0,${code}\n`
                + `//# sourceURL=webpack://Webpack${String(moduleId)}`,
            );
        } catch (e) {
            logger.warn(e, { code });
        }
    }
}
