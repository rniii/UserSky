/*
 * UserSky, a client modification for Bluesky
 * Copyright (c) 2026 rini and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface PluginDecl {
    name: string;
    description?: string;
    patches?: Patch[];
}

export interface Patch {
    find: string | string[];
    replacement: Replacement | Replacement[];
}

export interface Replacement {
    match: string | RegExp;
    replace: string | ((substring: string, ...args: any[]) => string);
}

export type WebpackFactory<Exports = any> = (
    this: Exports,
    module: WebpackModule,
    exports: Exports,
    require: WebpackRequire,
) => void;

export interface WebpackModule<Exports = any> {
    exports: Exports;
}

export interface WebpackRequire {
    m: Record<keyof any, WebpackFactory>;
    c: Record<keyof any, WebpackModule>;

    (moduleId: keyof any): any;
}
