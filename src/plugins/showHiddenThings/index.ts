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

import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    showTimeouts: {
        type: OptionType.BOOLEAN,
        description: "Show member timeout icons in chat.",
        default: true,
    },
    showInvitesPaused: {
        type: OptionType.BOOLEAN,
        description: "Show the invites paused tooltip in the server list.",
        default: true,
    },
    showModView: {
        type: OptionType.BOOLEAN,
        description: "Show the member mod view context menu item in all servers.",
        default: true,
    },
    showViewAsRole: {
        type: OptionType.BOOLEAN,
        description: "Always show view as role, whether or not you're an admin.",
        default: true,
    },
    disableDiscoveryFilters: {
        type: OptionType.BOOLEAN,
        description: "Disable filters in Server Discovery search that hide servers that don't meet discovery criteria.",
        default: true,
    },
    disableDisallowedDiscoveryFilters: {
        type: OptionType.BOOLEAN,
        description: "Disable filters in Server Discovery search that hide NSFW & disallowed servers.",
        default: true,
    },
});

migratePluginSettings("ShowHiddenThings", "ShowTimeouts");
export default definePlugin({
    name: "ShowHiddenThings",
    tags: ["ShowTimeouts", "ShowInvitesPaused", "ShowModView", "DisableDiscoveryFilters"],
    description: "Displays various hidden & moderator-only things regardless of permissions.",
    authors: [Devs.Dolfies, Devs.niko],
    patches: [
        {
            find: "showCommunicationDisabledStyles",
            predicate: () => settings.store.showTimeouts,
            replacement: {
                match: /&&\i\.\i\.canManageUser\(\i\.\i\.MODERATE_MEMBERS,\i\.author,\i\)/,
                replace: "",
            },
        },
        {
            find: "2022-07_invites_disabled",
            predicate: () => settings.store.showInvitesPaused,
            replacement: {
                match: /\i\.\i\.can\(\i\.\i.MANAGE_GUILD,\i\)/,
                replace: "true",
            },
        },
        {
            find: /context:\i,checkElevated:!1\}\),\i\.\i.{0,200}autoTrackExposure/,
            predicate: () => settings.store.showModView,
            replacement: {
                match: /return \i\.\i\(\i\.\i\(\{user:\i,context:\i,checkElevated:!1\}\),\i\.\i\)/,
                replace: "return true",
            }
        },
        {
            find: "prod_discoverable_guilds",
            predicate: () => settings.store.disableDiscoveryFilters,
            replacement: {
                match: /\{"auto_removed:.*?\}/,
                replace: "{}"
            }
        },
        // remove the 200 server minimum
        {
            find: '">200"',
            predicate: () => settings.store.disableDiscoveryFilters,
            replacement: {
                match: '">200"',
                replace: '">0"'
            }
        },
        // empty word filter (why would anyone search "horny" in fucking server discovery... please... why are we patching this again??)
        {
            find: '"horny","fart"',
            predicate: () => settings.store.disableDisallowedDiscoveryFilters,
            replacement: {
                match: /=\["egirl",.+?\]/,
                replace: "=[]"
            }
        },
        // empty 2nd word filter
        {
            find: '"pepe","nude"',
            predicate: () => settings.store.disableDisallowedDiscoveryFilters,
            replacement: {
                match: /\?\["pepe",.+?\]/,
                replace: "?[]",
            },
        },
        // patch request that queries if term is allowed
        {
            find: ".GUILD_DISCOVERY_VALID_TERM",
            predicate: () => settings.store.disableDisallowedDiscoveryFilters,
            all: true,
            replacement: {
                match: /\i\.\i\.get\(\{url:\i\.\i\.GUILD_DISCOVERY_VALID_TERM,query:\{term:\i\},oldFormErrors:!0\}\);/g,
                replace: "Promise.resolve({ body: { valid: true } });"
            }
        },
        // Role list patch for view as role
        {
            find: "}canImpersonateRole(",
            predicate: () => settings.store.showViewAsRole,
            replacement: {
                match: /\i\.can\(\i\.\i\.MANAGE_GUILD,\i\)&&\i\.can\(\i\.\i\.MANAGE_ROLES,\i\)/,
                replace: "true"
            }
        },
        // Patch "select roles" dropdown on view as role banner, otherwise it will pop out "You do not have permissions to use this feature" instead of the roles list
        {
            find: ".VIEW_AS_ROLES_NO_ACCESS",
            predicate: () => settings.store.showViewAsRole,
            replacement: {
                match: /\i\.isOwner\(\i\.id\)/,
                replace: "true"
            }
        }
    ],
    settings,
});
