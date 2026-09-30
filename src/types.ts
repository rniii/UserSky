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

export type MetroFactory<Exports = any> = (
    global: any,
    require: MetroRequire,
    metroImportDefault: MetroRequire["importDefault"],
    metroImportAll: MetroRequire["importAll"],
    module: { exports: Exports },
    exports: Exports,
    dependencyMap: Record<number, keyof any> & { paths: Record<keyof any, string>; },
) => void;

export interface MetroModule<Exports = any> {
    dependencyMap?: any[];
    factory?: MetroFactory;
    hasError: boolean;
    importedAll: any;
    importedDefault: any;
    isInitialized: boolean;
    publicModule: {
        id?: keyof any;
        exports?: Exports;
    };
}

export interface MetroDeclare {
    (factory: MetroFactory, moduleId: any, dependencyMap: any[]): void;
}

export interface MetroRequire {
    importDefault: (moduleId: keyof any) => any;
    importAll: (moduleId: keyof any) => any;
    // context: () => never;
    // resolveWeak: () => never;
    // unguarded: any; // idk
}

export type AnyFactory = WebpackFactory | MetroFactory;
