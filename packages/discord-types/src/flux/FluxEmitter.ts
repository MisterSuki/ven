/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { FluxStore } from "../stores/abstract/FluxStore";

// Original name: Emitter
export declare class FluxEmitter {
    batched<T>(callback: () => T): T;
    destroy(): void;
    emit(): void;
    emitNonReactOnce(syncWiths: Set<() => unknown>, changedStores: Set<FluxStore>): void;
    emitReactOnce(): void;
    getChangeSentinel(): number;
    getIsPaused(): boolean;
    injectBatchEmitChanges(batchEmitChanges: () => unknown): void;
    markChanged(store: FluxStore): void;
    /** If timeout is omitted, Emitter will pause until resume is called. */
    pause(timeout?: number | undefined): void;
    resume(shouldEmit?: boolean | undefined /* = true */): void;

    changedStores: Set<FluxStore>;
    changeSentinel: number;
    isBatchEmitting: boolean;
    isDispatching: boolean;
    isPaused: boolean;
    pauseTimer: number | null;
    reactChangedStores: Set<FluxStore>;
}
