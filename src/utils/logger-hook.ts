/*
 * UserSky, a client modification for Bluesky
 * Copyright (c) 2026 rini and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React } from "../modules.ts";
import { getLogCounts, eventTarget } from "./logger.ts";

export function useLogCounts() {
    const logCounts = getLogCounts();
    const [, forceUpdate] = React.useReducer(() => ({}), {});

    React.useEffect(() => {
        eventTarget.addEventListener("log", forceUpdate);

        return () => eventTarget.removeEventListener("log", forceUpdate);
    }, []);

    return logCounts;
}
