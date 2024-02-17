/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, findGroupChildrenByChildId, NavContextMenuPatchCallback,removeContextMenuPatch } from "@api/ContextMenu";
import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { OptionType } from "@utils/types";
import definePlugin from "@utils/types";
import { Button,Menu } from "@webpack/common";
import React, { ReactNode } from "react";

const settings = definePluginSettings({
    showGif: {
        type: OptionType.BOOLEAN,
        description: "Whether to show a snazzy cat gif",
        default: true,
        restartNeeded: true
    },
    showMessage: {
        type: OptionType.BOOLEAN,
        description: "Whether to show a message detailing which id was blocked",
        default: false,
        restartNeeded: true
    },
    showButton: {
        type: OptionType.BOOLEAN,
        description: "Whether to show a button to unblock the gif",
        default: true,
        restartNeeded: true
    },
    blockedStickers: {
        type: OptionType.STRING,
        description: "The list of blocked sticker IDs (don't edit unless you know what you're doing)",
        default: ""
    }
});

export default definePlugin({
    name: "StickerBlocker",
    description: "Allows you to block stickers from being displayed.",
    authors: [Devs.Samwich],
    patches: [
        {
            find: "r.default.STICKER_MESSAGE",
            replacement: {
                match: /}\),\(null!=N\?N:t\)\.name]}\);/,
                replace: "}),(null!=N?N:t).name]}); if(Vencord.Settings.plugins.StickerBlocker.blockedStickers.split(\", \").includes(t.id)) { return($self.blockedComponent(t)) }"
            }
        }
    ],
    start() {
        addContextMenuPatch("message", messageContextMenuPatch);
        DataStore.createStore("StickerBlocker", "data");
    },
    stop() {
        removeContextMenuPatch("message", messageContextMenuPatch);
    },
    blockedComponent: ErrorBoundary.wrap(blockedComponentRender, { fallback: () => <p style={{ color: "red" }}>Failed to render :(</p> }),
    settings,
});

function blockedComponentRender(sticker) {
    const { showGif, showMessage, showButton } = settings.store;
    const elements = [] as ReactNode[];

    if (showGif) {
        elements.push(
            <img key="gif" src="https://files.catbox.moe/bdsc58.gif" style={{ width: "160px", borderRadius: "20px" }}/>
        );
    }

    if (showMessage) {
        elements.push(
            <div key="message" id="message-content-1205482612316184657" className={"markup_a7e664 messageContent__21e69"}><span>Blocked Sticker. ID: {sticker.id}, NAME: {sticker.name}</span></div>
        );
    }

    if (showButton) {
        elements.push(
            <Button key="button" onClick={() => toggleBlock(sticker.id)}color={Button.Colors.RED}>Unblock {(showMessage) ? "" : sticker.name}</Button>
        );
    }

    return <>{elements}</>;
}


const messageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => () => {
    const { favoriteableType, favoriteableId } = props ?? {};
    if (favoriteableType !== "sticker") { return; }
    if (favoriteableId === null) { return; }
    const group = findGroupChildrenByChildId("reply", children);
    if (!group) return;

    group.splice(group.findIndex(c => c?.props?.id === "reply") + 1, 0, buttonThingy(favoriteableId));
};

function buttonThingy(name) {
    return (
        <Menu.MenuItem
            id="add-sticker-block"
            key="add-sticker-block"
            label={(isStickerBlocked(name)) ? "Unblock" : "Block"}
            action={() => toggleBlock(name)}
        />
    );
}

function toggleBlock(name) {
    if (settings.store.blockedStickers === undefined || settings.store.blockedStickers == null) {
        return;
    }
    const excepted = isStickerBlocked(name);
    if (excepted) {
        settings.store.blockedStickers = settings.store.blockedStickers.split(", ").filter(item => item !== name).join(", ");
    } else {
        settings.store.blockedStickers = settings.store.blockedStickers.split(", ").concat(name).join(", ");
    }
}


function isStickerBlocked(name) {
    if (settings.store.blockedStickers === undefined || settings.store.blockedStickers == null) {
        return;
    }
    return settings.store.blockedStickers.split(", ").includes(name);
}
