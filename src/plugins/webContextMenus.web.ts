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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { saveFile } from "@utils/web";
import { findByProps, findLazy } from "@webpack";
import { Clipboard } from "@webpack/common";

async function fetchImage(url: string) {
    const res = await fetch(url);
    if (res.status !== 200) return;

    return await res.blob();
}

const MiniDispatcher = findLazy(m => m.emitter?._events?.INSERT_TEXT);

export default definePlugin({
    name: "WebContextMenus",
    description: "Re-adds context menus missing in the web version of Discord: Images, ChatBar, 'Copy Link', 'Open Link', 'Copy Image', 'Save Image'",
    authors: [Devs.Ven],
    enabledByDefault: true,

    start() {
        const ctxMenuCallbacks = findByProps("contextMenuCallbackNative");
        // cope
        window.addEventListener("contextmenu", ctxMenuCallbacks.contextMenuCallbackNative);
        window.removeEventListener("contextmenu", ctxMenuCallbacks.contextMenuCallbackWeb);
    },

    patches: [
        // Add back Copy & Open Link
        {
            // There is literally no reason for Discord to make this Desktop only.
            // The only thing broken is copy, but they already have a different copy function
            // with web support????
            find: "open-native-link",
            replacement: [
                {
                    // if (IS_DESKTOP || null == ...)
                    match: /if\(!\i\.\i\|\|null==/,
                    replace: "if(null=="
                },
                // Fix silly Discord calling the non web support copy
                {
                    match: /\w\.default\.copy/,
                    replace: "Vencord.Webpack.Common.Clipboard.copy"
                }
            ]
        },

        // Add back Copy & Save Image
        {
            find: 'id:"copy-image"',
            replacement: [
                {
                    // if (!IS_WEB || null ==
                    match: /if\(!\i\.\i\|\|null==/,
                    replace: "if(null=="
                },
                {
                    match: /return\s*?\[\i\.default\.canCopyImage\(\)/,
                    replace: "return [true"
                },
                {
                    match: /(?<=COPY_IMAGE_MENU_ITEM,)action:/,
                    replace: "action:()=>$self.copyImage(arguments[0]),oldAction:"
                },
                {
                    match: /(?<=SAVE_IMAGE_MENU_ITEM,)action:/,
                    replace: "action:()=>$self.saveImage(arguments[0]),oldAction:"
                },
            ]
        },

        // Add back image context menu
        {
            find: 'navId:"image-context"',
            replacement: {
                // return IS_DESKTOP ? React.createElement(Menu, ...)
                match: /return \i\.\i\?(?=\(0,\i\.jsxs?\)\(\i\.Menu)/,
                replace: "return true?"
            }
        },

        // Add back link context menu
        {
            find: '"interactionUsernameProfile"',
            replacement: {
                match: /if\("A"===\i\.tagName&&""!==\i\.textContent\)/,
                replace: "if(false)"
            }
        },

        // Add back slate / text input context menu
        {
            find: '"slate-toolbar"',
            replacement: {
                match: /(?<=\.handleContextMenu=.+?"bottom";)\i\.\i\?/,
                replace: "true?"
            }
        },
        {
            find: 'navId:"textarea-context"',
            replacement: [
                {
                    // desktopOnlyEntries = makeEntries(), spellcheckChildren = desktopOnlyEntries[0], languageChildren = desktopOnlyEntries[1]
                    match: /\i=.{0,30}text:\i,target:\i,onHeightUpdate:\i\}\),2\),(\i)=\i\[0\],(\i)=\i\[1\]/,
                    // set spellcheckChildren & languageChildren to empty arrays, so just in case patch 3 fails, we don't
                    // reference undefined variables
                    replace: "$1=[],$2=[]",
                },
                {
                    // if (!IS_DESKTOP) return
                    match: /(?<=showApplicationCommandSuggestions;)if\(!\i\.\i\)/,
                    replace: "if(false)"
                },
                {
                    // do not add menu items for entries removed in patch 1. Using a lookbehind for group 1 is slow,
                    // so just capture and add back
                    match: /("submit-button".+?)(\(0,\i\.jsx\)\(\i.MenuGroup,\{children:\i\}\),){2}/,
                    replace: "$1"
                },
                {
                    // Change calls to DiscordNative.clipboard to us instead
                    match: /\b\i\.default\.(copy|cut|paste)/g,
                    replace: "$self.$1"
                }
            ]
        }
    ],

    async copyImage(url: string) {
        const data = await fetchImage(url);
        if (!data) return;

        await navigator.clipboard.write([
            new ClipboardItem({
                [data.type]: data
            })
        ]);
    },

    async saveImage(url: string) {
        const data = await fetchImage(url);
        if (!data) return;

        const name = url.split("/").pop()!;
        const file = new File([data], name, { type: data.type });

        saveFile(file);
    },

    copy() {
        const selection = document.getSelection();
        if (!selection) return;

        Clipboard.copy(selection.toString());
    },

    cut() {
        this.copy();
        MiniDispatcher.dispatch("INSERT_TEXT", { rawText: "" });
    },

    async paste() {
        const text = await navigator.clipboard.readText();

        const data = new DataTransfer();
        data.setData("text/plain", text);

        document.dispatchEvent(
            new ClipboardEvent("paste", {
                clipboardData: data
            })
        );
    }
});
