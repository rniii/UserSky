/*
 * UserSky, a client modification for Bluesky
 * Copyright (c) 2026 rini and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

type Level = "error" | "warn" | "info" | "log" | "debug";

const logCounts = {
    warnings: 0,
    errors: 0,
};

export function getLogCounts() {
    return logCounts;
}

export class Logger {
    constructor(public name: string, public color = "#ddd") {}

    error(...args: any[]) {
        logCounts.errors++;
        this._log("#faa", "error", ...args);
    }

    warn(...args: any[]) {
        logCounts.warnings++;
        this._log("#ffa", "warn", ...args);
    }

    info(...args: any[]) {
        this._log("#abf", "info", ...args);
    }

    log(...args: any[]) {
        this._log("#abf", "log", ...args);
    }

    debug(...args: any[]) {
        this._log("#f7e", "debug", ...args);
    }

    private _log(levelColor: string, level: Level, ...args: any[]) {
        const style = "color:#111;font-weight:700;border-radius:99px";
        const msg = typeof args[0] == "string" ? " " + args.shift() : "";

        console[level](
            `%c UserSky %c %c ${this.name} %c` + msg,
            `background:${levelColor};${style}`, "",
            `background:${this.color};${style}`, "",
            ...args,
        );
    }
}
