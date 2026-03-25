/*
 * UserSky, a client modification for Bluesky
 * Copyright (c) 2026 rini and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { PropsWithChildren, ReactNode } from "react";

import { html } from "../index.ts";
import { Logger } from "../utils/logger.ts";
import { React } from "../webpack/common.ts";

const logger = new Logger("ErrorBoundary", "#ca123d");

type Props = { fallback?: ReactNode; };

export function ErrorBoundary(props: PropsWithChildren<Props>) {
    class ErrorBoundaryInner extends React.Component<Props> {
        state: { error?: any } = {};

        static getDerivedStateFromError(error: any) {
            return { error };
        }

        componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
            logger.error("Caught error:", error);
            logger.error(errorInfo.componentStack);
        }

        render(): ReactNode {
            if (!("error" in this.state)) return props.children;
            if ("fallback" in props) return props.fallback;

            return html`<div title=${this.state.error}>oh no</div>`;
        }
    }

    return html`<${ErrorBoundaryInner} ...${props} />`;
}

export function withErrorBoundary(Component: React.ComponentType, props: Props = {}) {
    return (componentProps: any) => html`<${ErrorBoundary} ...${props}>
        <${Component} ...${componentProps} />
    <//>`;
}
