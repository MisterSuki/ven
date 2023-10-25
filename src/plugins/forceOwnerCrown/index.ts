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
import { GuildStore } from "@webpack/common";
import { Channel, User } from "discord-types/general";

export default definePlugin({
    name: "ForceOwnerCrown",
    description: "Force the owner crown next to usernames even if the server is large.",
    authors: [Devs.D3SOX, Devs.Nickyux],
    patches: [
        {
            find: "AVATAR_DECORATION_PADDING:",
            replacement: {
                match: /var (\w+)=function\((\w+)\){/g,
                replace: "var $1=function($2){$self.setGuildOwner($2);"
            }
        }
    ],
    setGuildOwner(props: { user: User, channel: Channel, isOwner: boolean, guildId?: string; }) {
        if (!props?.user?.id) return;
        if (props.channel?.type === 3 /* GROUP_DM */)
            return;

        // guild id is in props twice, fallback if the first is undefined
        const guildId = props.guildId ?? props.channel?.guild_id;
        const userId = props.user.id;

        if (GuildStore.getGuild(guildId)?.ownerId === userId) {
            props.isOwner = true;
        }
    },
});
