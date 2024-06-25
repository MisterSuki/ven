/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { patchMarkdownRules } from "@api/MarkdownRules";
import { Devs } from "@utils/constants";
import definePlugin, { StartAt } from "@utils/types";

export default definePlugin({
    name: "MarkDownRulesAPI",
    description: "API to add/mod markdown rules",
    authors: [Devs.iamme],
    patches: [
        {
            find: "{RULES:",
            replacement: {
                match: /{RULES:[^}]+}/,
                replace: "Vencord.Api.MarkdownRules.patchMarkdownRules($&)"
            }
        }
    ],
    startAt: StartAt.Init,
    patchMarkdownRules
});
