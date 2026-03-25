/*
 * UserSky, a client modification for Bluesky
 * Copyright (c) 2026 rini and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByPropsLazy } from "./index.ts";

export const React = findByPropsLazy("createElement", "Fragment") as typeof import("react");

// src/alf/index.tsx
export const Alf = findByPropsLazy("useAlf", "useTheme");

// src/components/Typography.tsx
export const Typography = findByPropsLazy("Span", "Text", "H1");
