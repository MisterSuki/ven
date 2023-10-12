/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import moment from "moment";
import { ComponentClass, ComponentType } from "react";
const classNames = findByPropsLazy("timestampTooltip");

function re(strings: TemplateStringsArray, ...values: any[]) {
    const s = String.raw(strings, ...values)
        .trim()
        .split("\n")
        .map(line => {
            line = line.trimStart();
            if (line.startsWith("#")) return null;
            return line;
        })
        .filter(Boolean)
        .join("");
    return new RegExp(s);
}

export default definePlugin({
    name: "DetailedTimestamp",
    description: "Show detailed timestamp of messages with customizable format",
    authors: [Devs.UlyssesZhan],
    settings: definePluginSettings({
        timestampAlwaysOn: {
            type: OptionType.BOOLEAN,
            description: "Always show timestamp of messages instead of on hover",
            default: true,
        },
        messageFormat: {
            type: OptionType.STRING,
            description: "Time format of messages (Discord default: LT for compact mode)",
            default: "HH:mm:ss",
        },
        tooltipFormat: {
            type: OptionType.STRING,
            description: "Time format of time tooltips of messages (Discord default: LLLL)",
            default: "YYYY-MM-DDTHH:mm:ss.SSSZ (x)",
        },
        dayFormat: {
            type: OptionType.STRING,
            description: "Time format of dates of messages (Discord default: LL)",
            default: "YYYY-MM-DD",
        },
        callFormat: {
            type: OptionType.STRING,
            description: "Time format of calling events before today (Discord default: L LT)",
            default: "HH:mm:ss",
        },
        memberSinceFormat: {
            type: OptionType.STRING,
            description: "Time format of member since (Discord default: ll (lowercase))",
            default: "YYYY-MM-DD",
        },
        memberSinceTooltips: {
            type: OptionType.BOOLEAN,
            description: "Show member since tooltips",
            default: true,
        },
        memberSinceTooltipFormat: {
            type: OptionType.STRING,
            description: "Time format of member since tooltips (only useful when the previous option is enabled)",
            default: "YYYY-MM-DDTHH:mm:ss.SSSZ (x)",
        },
        newMessagesFormat: {
            type: OptionType.STRING,
            description: "Time format of new messages since (Discord default: \"LT\" or \"LT [on] LL\")",
            default: "HH:mm:ss [on] YYYY-MM-DD",
        },
        integrationFormat: {
            type: OptionType.STRING,
            description: "Time format of webhook creation etc. (Discord default: ll)",
            default: "HH:mm:ss [on] YYYY-MM-DD",
        }
    }),
    patches: [
        {
            find: "showTimestampOnHover:!",
            replacement: {
                match: /showTimestampOnHover:(.*?\.REPLY),/,
                replace: "showTimestampOnHover: ($1) && !$self.settings.store.timestampAlwaysOn,"
            }
        },
        {
            find: "\"LT\"):(",
            replacement: {
                match: /\i\?(\(0,.*?)"LT"\):\(0,.*?\)\(\i\),/,
                replace: "$1$self.settings.store.messageFormat),"
            }
        },
        {
            find: "\"LLLL\"),",
            replacement: {
                match: /"LLLL"/,
                replace: "$self.settings.store.tooltipFormat"
            }
        },
        {
            find: "].startId),",
            replacement: {
                match: /"LL"/,
                replace: "$self.settings.store.dayFormat"
            }
        },
        {
            find: "().localeData(),",
            replacement: {
                match: /"L LT"/,
                replace: "$self.settings.store.callFormat"
            }
        },
        {
            find: "USER_PROFILE_DISCORD_MEMBER_SINCE}",
            replacement: {
                // (0, r.jsx)(o.Text, { ... (0, a.FI)(u.Z.extractTimestamp(t), p) }), ...
                // (0, r.jsx)(o.Text, { ... (0, a.FI)(g.joinedAt, p) })
                // where `t` is user id, timestamps are milliseconds unix timestamp, `p` is locale (I think)
                match: re`
                    # React.createElement
                    (\(0,\i\.\i\))\(
                        # component type namespace
                        (\i)\.Text,\{
                            # unmodified parameters
                            (.{0,200}),
                            children:\(0,\i\.\i\)\(
                                # timestamp
                                (\i\.\i\.extractTimestamp\(\i\)),
                                \i
                            \)
                        \}
                    \),
                    # unmodified components
                    (.{0,800}),
                    \(0,\i\.\i\)\(\i\.Text,\{
                        # unmodified parameters
                        (.{0,200}),
                        children:\(0,\i\.\i\)\(
                            # timestamp
                            (\i\.joinedAt),
                            \i
                        \)
                    \}\)
                `,
                replace: (matched, createElement, componentTypes, unmodifiedParameters1, timestamp1, unmodifiedComponents, unmodifiedParameters2, timestamp2) => {
                    return `
                        $self.wrapTooltip(${createElement}, ${componentTypes}, ${timestamp1}, {${unmodifiedParameters1}}),
                        ${unmodifiedComponents},
                        $self.wrapTooltip(${createElement}, ${componentTypes}, ${timestamp2}, {${unmodifiedParameters2}})
                    `;
                }
            }
        },
        {
            find: ".connectedAccount,",
            replacement: {
                match: re`
                    # formatted time
                    # show metadata?
                    (\i)=(\i)\?
                    # timestamp
                    \(0,\i\.\i\)\((\i\[\i\.\i\.CREATED_AT\]),\i\)
                    # unmodified
                    (.{0,2500})
                    # createElement
                    (\(0,\i\.\i\))\(
                        # component type namespace
                        (\i)\.Text,
                        # options
                        (\{.{0,200}\})
                    \):null
                `,
                replace: (matched, formattedTime, showMetadata, timestamp, unmodified, createElement, componentTypes, options) => {
                    return `
                        ${formattedTime} = ${showMetadata} ? $self.formatTime(${timestamp}, $self.settings.store.memberSinceFormat)
                        ${unmodified}
                        $self.wrapTooltip(${createElement}, ${componentTypes}, ${timestamp}, ${options}) : null
                    `;
                }
            }
        },
        {
            find: ".connectionAccountLabelContainer,",
            replacement: {
                match: re`
                    # formatted time
                    (\i)=
                    # timestamp
                    \(0,\i\.\i\)\((\i\[\i\.\i\.CREATED_AT\]),\i\)
                    # unmodified
                    (.{0,2000})
                    # createElement
                    (\(0,\i\.\i\))\(
                        # component type namespace
                        (\i)\.Text,
                        # options and key
                        (\{.{0,500}\},"member-since")
                    \)
                `,
                replace: (matched, formattedTime, timestamp, unmodified, createElement, componentTypes, optionsAndKey) => {
                    return `
                        ${formattedTime} = $self.formatTime(${timestamp}, $self.settings.store.memberSinceFormat)
                        ${unmodified}
                        $self.wrapTooltip(${createElement}, ${componentTypes}, ${timestamp}, ${optionsAndKey})
                    `;
                }
            }
        },
        {
            find: "\"INTEGRATION_ADDED_USER\"",
            replacement: [
                {
                    match: /("INTEGRATION_ADDED_DATE",.{0,30}){timestamp.{0,20}}(.{0,100}?){timestamp.{0,20}}(.{0,100}?){timestamp.{0,20}}(.{0,100}?){timestamp.{0,20}}/,
                    replace: "$1{timestamp}$2{timestamp}$3{timestamp}$4{timestamp}"
                },
                {
                    match: /("WEBHOOK_CREATED_ON".{0,50}?){timestamp.{0,20}}/,
                    replace: "$1{timestamp}"
                },
                {
                    match: /("NEW_MESSAGES".{0,80}?){timestamp.{0,20}}(.{0,300}?){timestamp.{0,50}}(.{0,200}?){timestamp.{0,20}}(.{0,200}?){timestamp.{0,50}}/,
                    replace: "$1{timestamp}$2{timestamp}$3{timestamp}$4{timestamp}"
                }
            ]
        },
        {
            find: "\"has-more-after\"));",
            replacement: {
                match: /(format\({.{0,20}?,timestamp:)(\i)(}\).{0,1000}?format\({.{0,20}?,timestamp:)(\i)(\}\))/,
                replace: "$1 $self.formatTime($2, $self.settings.store.newMessagesFormat) $3 $self.formatTime($4, $self.settings.store.newMessagesFormat) $5"
            }
        },
        {
            find: ".integration.id);",
            replacement: [
                {
                    match: /(name]\).{0,150}timestamp:)(\i\.\i\.extractTimestamp\(\i.id\))(.{0,50}?push.{0,80}?timestamp:)(\i\.\i\.extractTimestamp\(\i.id\))/,
                    replace: "$1 $self.formatTime($2, $self.settings.store.integrationFormat) $3 $self.formatTime($4, $self.settings.store.integrationFormat)"
                },
                {
                    match: /(useMemo.{0,100}timestamp:)(\i\.\i\.extractTimestamp\(\i.id\))/,
                    replace: "$1 $self.formatTime($2, $self.settings.store.integrationFormat)"
                },
                {
                    match: /datetime:(.{0,40}?).calendar\(\)/,
                    replace: "datetime: $self.formatTime($1, $self.integrationFormat)"
                },
                {
                    match: /(emoticons.{0,300}timestamp:)(\i\.\i\.extractTimestamp\(\i.id\))(.{0,100}?timestamp:)(\i\.\i\.extractTimestamp\(\i.id\))/,
                    replace: "$1 $self.formatTime($2, $self.settings.store.integrationFormat) $3 $self.formatTime($4, $self.settings.store.integrationFormat)"
                },
                {
                    match: /(\i\.integration,.{0,150}timestamp:)(\i\.\i\.extractTimestamp\(\i.id\))(.{0,50}?push.{0,80}?timestamp:)(\i\.\i\.extractTimestamp\(\i.id\))/,
                    replace: "$1 $self.formatTime($2, $self.settings.store.integrationFormat) $3 $self.formatTime($4, $self.settings.store.integrationFormat)"
                }
            ]
        }
    ],

    formatTime(time: number | string | undefined, format: string) {
        return time == null ? null : moment(time).format(format);
    },
    wrapTooltip(createElement: (type: ComponentType, options: any, key?: string) => ComponentClass, componentTypes: any, timestamp: number, componentOptions: any, key?: string) {
        componentOptions.children ??= this.formatTime(timestamp, this.settings.store.memberSinceFormat);
        if (!this.settings.store.memberSinceTooltips) {
            return createElement(componentTypes.Text, componentOptions);
        }
        return createElement(componentTypes.Tooltip, {
            text: this.formatTime(timestamp, this.settings.store.memberSinceTooltipFormat),
            tooltipClassName: classNames,
            delay: 750,
            children: (e: any) => createElement(componentTypes.Text, Object.assign(componentOptions, e))
        }, key);
    }
});
