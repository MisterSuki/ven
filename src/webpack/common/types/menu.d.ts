/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

type RC<C> = React.ComponentType<React.PropsWithChildren<C & Record<string, any>>>;

export interface Menu {
    ContextMenu: RC<{
        navId: string;
        onClose(): void;
        className?: string;
        style?: React.CSSProperties;
        hideScroller?: boolean;
        onSelect?(): void;
    }>;
    MenuSeparator: React.ComponentType;
    MenuGroup: RC<any>;
    MenuItem: RC<{
        id: string;
        label: string;
        render?: React.ComponentType;
        onChildrenScroll?: Function;
        childRowHeight?: number;
        listClassName?: string;
    }>;
    MenuCheckboxItem: RC<{
        id: string;
    }>;
    MenuRadioItem: RC<{
        id: string;
    }>;
    MenuControlItem: RC<{
        id: string;
        interactive?: boolean;
    }>;
}

export type ContextMenuApi = {
    close(): void;
    open(
        event: React.UIEvent,
        render?: Menu["ContextMenu"],
        options?: { enableSpellCheck?: boolean; },
        renderLazy?: () => Promise<Menu["ContextMenu"]>
    ): void;
    openLazy(
        event: React.UIEvent,
        renderLazy?: () => Promise<Menu["ContextMenu"]>,
        options?: { enableSpellCheck?: boolean; }
    ): void;
};

