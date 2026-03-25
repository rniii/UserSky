/*
 * UserSky, a client modification for Bluesky
 * Copyright (c) 2026 rini and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "./logger.ts";

const logger = new Logger("Utils");

export function lazy<T extends object>(get: () => T | undefined): () => T {
    let cached: any;

    return function () {
        if (cached !== undefined) return cached;
        if ((cached = get()) !== undefined) return logger.debug(get, cached), cached;

        logger.warn(get, "is undefined");
    };
}

export function makeLazyProxy<T extends object>(get: () => T | undefined): T {
    let sameTick = true;
    setTimeout(() => sameTick = false);

    function inner(target: () => T) {
        return new Proxy(target, { ...lazyHandler, get(target, key, receiver) {
            if (sameTick) return inner(function () {
                return Reflect.get(target(), key, receiver);
            });

            return Reflect.get(target(), key, receiver);
        } });
    }

    return inner(lazy(get));
}

const lazyHandler: ProxyHandler<any> = {};

for (const method of [
    "apply",
    "construct",
    "defineProperty",
    "deleteProperty",
    "getOwnPropertyDescriptor",
    "getPrototypeOf",
    "has",
    "isExtensible",
    "ownKeys",
    "preventExtensions",
    "set",
    "setPrototypeOf",
] as const) {
    // @ts-expect-error don't worry about it
    lazyHandler[method] = (target, ...args) => Reflect[method](target(), ...args);
}
