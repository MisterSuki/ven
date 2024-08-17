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

import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";

const FriendInvites = findByPropsLazy("createFriendInvite");

export default definePlugin({
    name: "FriendInvites",
    description: "Create and manage friend invite links via slash commands (/fvite create, /fvite list, /fvite revoke).",
    authors: [ Devs.afn, Devs.Dziurwa ],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "friendinvite create",
            description: "Generates a friend invite link.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: async (_, ctx) => {
                const invite = await FriendInvites.createFriendInvite();

                sendBotMessage(ctx.channel.id, {
                    content: `
                        discord.gg/${invite.code} ·
                        Expires: <t:${new Date(invite.expires_at).getTime() / 1000}:R> ·
                        Max uses: \`${invite.max_uses}\`
                    `.trim().replace(/\s+/g, " ")
                });
            }
        },
        {
            name: "friendinvite list",
            description: "Lists all friend invite links.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: async (_, ctx) => {
                const invites = await FriendInvites.getAllFriendInvites();
                const friendInviteList = invites.map(i =>
                    `
                    discord.gg/${i.code} ·
                    Expires: <t:${new Date(i.expires_at).getTime() / 1000}:R> ·
                    Times used: \`${i.uses}/${i.max_uses}\`
                    `.trim().replace(/\s+/g, " ")
                );

                sendBotMessage(ctx.channel.id, {
                    content: friendInviteList.join("\n") || "You have no active friend invites!"
                });
            }
        },
        {
            name: "friendinvite revoke",
            description: "Revokes all friend invite links.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: async (_, ctx) => {
                await FriendInvites.revokeFriendInvites();

                sendBotMessage(ctx.channel.id, {
                    content: "All friend invites have been revoked."
                });
            }
        }
    ]
});
