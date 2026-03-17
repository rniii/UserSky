/*
 * UserSky, a client modification for Bluesky
 * Copyright (c) 2026 rini and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ReactNode } from "react";

import { html } from "../index.ts";
import { Logger } from "../utils/logger.ts";
import { React } from "../webpack/common.ts";

const logger = new Logger("ErrorBoundary", "#ca123d");

type Props = { fallback?: ReactNode; children?: ReactNode };

export function ErrorBoundary(props: Props) {
    class ErrorBoundaryInner extends React.Component<Props, { error?: any }> {
        constructor(props: Props) {
            super(props);
            this.state = {};
        }

        static getDerivedStateFromError(error: any) {
            return { error };
        }

        componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
            logger.error("Caught error:", error);
            logger.error(errorInfo.componentStack);
        }

        render(): ReactNode {
            return this.state.error
                ? props.fallback ?? html`<div title=${this.state.error}>oh no</div>`
                : props.children;
        }
    }

    return html`<${ErrorBoundaryInner} ...${props} />`;
}

export function withErrorBoundary(Component: React.ComponentType) {
    return (props: any) => html`<${ErrorBoundary}>
        <${Component} ...${props} />
    <//>`;
}
