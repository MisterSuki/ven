/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import type { AnchorHTMLAttributes, DetailedHTMLProps, PropsWithChildren } from "react";

interface Props extends DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement> {
    disabled?: boolean;
}

export function Link(props: PropsWithChildren<Props>) {
    if (props.disabled) {
        props.style ??= {};
        props.style.pointerEvents = "none";
        props["aria-disabled"] = true;
    }
    return (
        <a role="link" target="_blank" {...props}>
            {props.children}
        </a>
    );
}
