/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { React, RelationshipStore } from "@webpack/common";

const { Heading, Text } = findByPropsLazy("Heading");
const container = findByPropsLazy("memberSinceContainer");
const { getCreatedAtDate } = findByPropsLazy("getCreatedAtDate");
const clydeMoreInfo = findByPropsLazy("clydeMoreInfo");
const locale = findByPropsLazy("getLocale");
const lastSection = findByPropsLazy("lastSection");

export default definePlugin({
    name: "FriendsSince",
    description: "Show when you became friends with someone in the user popout",
    authors: [Devs.Elvyra],
    patches: [
        {
            find: "AnalyticsSections.USER_PROFILE}",
            replacement: {
                match: /\i.default,{userId:(\i.id).{0,30}}\)/,
                replace: "$&,$self.friendsSince($1)"
            }
        },
    ],

    friendsSince (userId: string) {
        const friendsSince = RelationshipStore.getSince(userId);
        if (!friendsSince) return;

        const { body: textClassName, title: headingClassName } = clydeMoreInfo;

        return <div className={lastSection.section}>
            <React.Fragment>
                <Heading variant="eyebrow" className={headingClassName}>
                Friends Since
                </Heading>
                <div className={container.memberSinceContainer}>
                    <Text variant="text-sm/normal" className={textClassName}>
                        {getCreatedAtDate(friendsSince, locale.getLocale())}
                    </Text>
                </div>
            </React.Fragment>
        </div>;
    }
});

