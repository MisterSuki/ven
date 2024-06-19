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
import { type ChannelRecord, ChannelType, type UserRecord } from "@vencord/discord-types";
import { GuildStore } from "@webpack/common";

export default definePlugin({
    name: "ForceOwnerCrown",
    description: "Force the owner crown next to usernames even if the server is large.",
    authors: [Devs.D3SOX, Devs.Nickyux],
    patches: [
        {
            find: ".PREMIUM_GUILD_SUBSCRIPTION_TOOLTIP",
            replacement: {
                match: /,isOwner:(\i),/,
                replace: ",_isOwner:$1=$self.isGuildOwner(e),"
            }
        }
    ],
    isGuildOwner(props: { user?: UserRecord, channel?: ChannelRecord, isOwner: boolean, guildId?: string; }) {
        if (!props.user?.id) return props.isOwner;
        if (props.channel?.type === ChannelType.GROUP_DM)
            return props.isOwner;

        // guild id is in props twice, fallback if the first is undefined
        const guildId = props.guildId ?? props.channel?.guild_id;
        const userId = props.user.id;

        return GuildStore.getGuild(guildId)?.ownerId === userId;
    },
});
