/*
 * UserSky, a client modification for Bluesky
 * Copyright (c) 2026 rini and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByPropsLazy } from "./index.ts";

export const React = findByPropsLazy("createElement", "Fragment") as typeof import("react");
