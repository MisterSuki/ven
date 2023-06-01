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

import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { ScreenshareIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { ImageModal, ModalRoot, ModalSize, openModalLazy } from "@utils/modal";
import definePlugin from "@utils/types";
import { ApplicationStreamingStore, ApplicationStreamPreviewStore, MaskedLink, Menu, ModalImageClasses } from "@webpack/common";
import { ApplicationStream, Stream } from "@webpack/types";
import { Channel, User } from "discord-types/general";

export interface UserContextProps {
    channel: Channel,
    channelSelected: boolean,
    className: string,
    config: { context: string; };
    context: string,
    onHeightUpdate: Function,
    position: string,
    target: HTMLElement,
    theme: string,
    user: User;
}

export interface StreamContextProps {
    appContext: string,
    className: string,
    config: { context: string; };
    context: string,
    exitFullscreen: Function,
    onHeightUpdate: Function,
    position: string,
    target: HTMLElement,
    stream: Stream,
    theme: string,
}

export const handleViewPreview = async ({ guildId, channelId, ownerId }: ApplicationStream | Stream) => {
    const previewUrl = await ApplicationStreamPreviewStore.getPreviewURL(guildId, channelId, ownerId);
    if (!previewUrl) return;

    openModalLazy(async () => {
        return props => (
            <ModalRoot
                {...props}
                className={ModalImageClasses.modal}
                size={ModalSize.DYNAMIC}>
                <ImageModal
                    className={ModalImageClasses.image}
                    original={previewUrl}
                    placeholder={previewUrl}
                    src={previewUrl}
                    shouldAnimate={true}
                    renderLinkComponent={props => <MaskedLink {...props} />}
                />
            </ModalRoot>
        );
    }
    );
};

export const addViewStreamContext = (children, { userId }: { userId: string | bigint; }) => {
    const streamPreviewItemIdentifier = "view-stream-preview";
    if (children.some(child => child?.props?.id === streamPreviewItemIdentifier)) return;

    const stream = ApplicationStreamingStore.getAnyStreamForUser(userId);

    const streamPreviewItem = (
        <Menu.MenuItem
            label="View Stream Preview"
            key={streamPreviewItemIdentifier}
            id={streamPreviewItemIdentifier}
            icon={ScreenshareIcon}
            action={() => stream && handleViewPreview(stream)}
            disabled={!stream}
        />
    );

    children.push(<Menu.MenuSeparator />, streamPreviewItem);
};

export const streamContextPatch: NavContextMenuPatchCallback = (children, { stream }: StreamContextProps) => {
    addViewStreamContext(children, { userId: stream.ownerId });
};

export const userContextPatch: NavContextMenuPatchCallback = (children, { user }: UserContextProps) => {
    addViewStreamContext(children, { userId: user.id });
};

export default definePlugin({
    name: "BiggerStreamPreview",
    description: "This plugin allows you to enlarge stream previews",
    authors: [Devs.phil],
    start: () => {
        addContextMenuPatch("user-context", userContextPatch);
        addContextMenuPatch("stream-context", streamContextPatch);
    },
    stop: () => {
        removeContextMenuPatch("user-context", userContextPatch);
        removeContextMenuPatch("stream-context", streamContextPatch);
    }
});
