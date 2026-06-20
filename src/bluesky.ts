/*
 * UserSky, a client modification for Bluesky
 * Copyright (c) 2026 rini and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByPropsLazy } from "./webpack.ts";

// src/alf/index.tsx
export const Alf = findByPropsLazy("useAlf", "useTheme");

// src/components/Typography.tsx
export const Typography = findByPropsLazy("Span", "Text", "H1");
