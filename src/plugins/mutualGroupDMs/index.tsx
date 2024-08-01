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

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { GroupDMChannelRecord, UserRecord } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { Avatar, ChannelStore, Clickable, IconUtils, RelationshipStore, ScrollerThin, UserStore, UserUtils } from "@webpack/common";
import type { ReactElement } from "react";

const SelectedChannelActionCreators = findByPropsLazy("selectPrivateChannel");

const ProfileListClasses: Record<string, string> = findByPropsLazy("emptyIconFriends", "emptyIconGuilds");
const GuildLabelClasses: Record<string, string> = findByPropsLazy("guildNick", "guildAvatarWithoutIcon");

function getGroupDMName(channel: GroupDMChannelRecord) {
    if (channel.name) return channel.name;

    const names: string[] = [];
    for (const userId of channel.recipients) {
        const user = UserStore.getUser(userId);
        if (user)
            names.push(RelationshipStore.getNickname(userId) || UserUtils.getName(user));
    }

    return names.join(", ");
}

export default definePlugin({
    name: "MutualGroupDMs",
    description: "Shows mutual group dms in profiles",
    authors: [Devs.amia],

    patches: [
        {
            find: ".Messages.MUTUAL_GUILDS_WITH_END_COUNT", // Note: the module is lazy-loaded
            replacement: {
                match: /(?<=\.tabBarItem.{0,50}MUTUAL_GUILDS.+?}\),)(?=.+?(\(0,\i\.jsxs?\)\(.{0,100}id:))/,
                replace: '$self.isBotOrMe(arguments[0].user)?null:$1"MUTUAL_GDMS",children:"Mutual Groups"}),'
            }
        },
        {
            find: ".USER_INFO_CONNECTIONS:case",
            replacement: {
                match: /(?<={user:(\i),onClose:(\i)}\);)(?=case \i\.\i\.MUTUAL_FRIENDS)/,
                replace: "case \"MUTUAL_GDMS\":return $self.renderMutualGDMs({user: $1, onClose: $2});"
            }
        },
        {
            find: ".MUTUAL_FRIENDS?(",
            replacement: [
                {
                    match: /(?<=onItemSelect:\i,children:)(\i)\.map/,
                    replace: "[...$1, ...($self.isBotOrMe(arguments[0].user) ? [] : [{section:'MUTUAL_GDMS',text:'Mutual Groups'}])].map"
                },
                {
                    match: /\(0,\i\.jsx\)\(\i,\{items:\i,section:(\i)/,
                    replace: "$1==='MUTUAL_GDMS'?$self.renderMutualGDMs(arguments[0]):$&"
                }
            ]
        }
    ],

    isBotOrMe: (user: UserRecord) => user.bot || user.id === UserStore.getCurrentUser()!.id,

    renderMutualGDMs: ErrorBoundary.wrap(({ user, onClose }: { user: UserRecord; onClose: () => void; }) => {
        const entries: ReactElement[] = [];
        for (const channel of ChannelStore.getSortedPrivateChannels())
            if (channel.isGroupDM() && channel.recipients.includes(user.id))
                entries.push(
                    <Clickable
                        className={ProfileListClasses.listRow}
                        onClick={() => {
                            onClose();
                            SelectedChannelActionCreators.selectPrivateChannel(channel.id);
                        }}
                    >
                        <Avatar
                            src={IconUtils.getChannelIconURL({ id: channel.id, icon: channel.icon, size: 32 })}
                            size="SIZE_40"
                            className={ProfileListClasses.listAvatar}
                        />
                        <div className={ProfileListClasses.listRowContent}>
                            <div className={ProfileListClasses.listName}>{getGroupDMName(channel)}</div>
                            <div className={GuildLabelClasses.guildNick}>{channel.recipients.length + 1} Members</div>
                        </div>
                    </Clickable>
                );

        return (
            <ScrollerThin
                className={ProfileListClasses.listScroller}
                fade={true}
                onClose={onClose}
            >
                {entries.length > 0
                    ? entries
                    : (
                        <div className={ProfileListClasses.empty}>
                            <div className={ProfileListClasses.emptyIconFriends} />
                            <div className={ProfileListClasses.emptyText}>No group dms in common</div>
                        </div>
                    )
                }
            </ScrollerThin>
        );
    })
});
