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

import { findByPropsLazy, findLazy } from "@webpack";
import { Parser } from "@webpack/common";
import { ASTParser, MarkdownRules } from "@webpack/types";

interface SlateRule {
    type: "skip" | "verbatim" | "inlineObject" | "inlineStyle";
    before?: string;
    after?: string;
}

type MarkdownRuleFactory = ((rules: Record<string, MarkdownRules>) => MarkdownRules)

const markdownRules: Map<string, MarkdownRuleFactory> = new Map();
const slateRules: Map<string, SlateRule> = new Map();
const slateDecorators: Map<string, string> = new Map();

export function addRule(name: string, markdownRule: MarkdownRuleFactory, slateRule: SlateRule, decorator?: string) {
    markdownRules.set(name, markdownRule);
    slateRules.set(name, slateRule);

    // should this propigate an error if its not inlineStyle but decorator is set?
    if (decorator != null && slateRule.type === "inlineStyle") {
        slateDecorators.set(name, decorator);
    }

    __rebuildParsers();
    __rebuildSlateParsers();
}
export function removeRule(name: string) {
    if (markdownRules.has(name)) markdownRules.delete(name);
    if (slateRules.has(name)) slateRules.delete(name);
    if (slateDecorators.has(name)) slateDecorators.delete(name);

    __rebuildParsers();
    __rebuildSlateParsers();
}

type Ruleset = "RULES" | "CHANNEL_TOPIC_RULES" | "EMBED_TITLE_RULES" | "INLINE_REPLY_RULES" | "GUILD_VERIFICATION_FORM_RULES" | "GUILD_EVENT_RULES" | "PROFILE_BIO_RULES" | "AUTO_MODERATION_SYSTEM_MESSAGE_RULES"

const blacklistedRules: Map<string, Set<string>> = new Map();

export function addBlacklist(ruleset: Ruleset, rule: string) {
    if (!blacklistedRules.has(ruleset)) blacklistedRules.set(ruleset, new Set());
    blacklistedRules.get(ruleset)?.add(rule);

    __rebuildParsers();
}
export function removeBlacklist(ruleset: Ruleset, rule: string) {
    if (blacklistedRules.has(ruleset)) blacklistedRules.get(ruleset)?.delete(rule);

    __rebuildParsers();
}

const rulesets = findByPropsLazy("RULES");
function __getCustomRules(ruleset: string = "RULES") {
    const rules = {};
    const blacklist = blacklistedRules.get(ruleset);
    for (const [name, rule] of markdownRules) {
        if (blacklist?.has(name)) continue;

        rules["vc_" + name] = rule(rulesets[ruleset] ?? rulesets.RULES);
    }

    return rules;
}

// i have exhausted all my options for figuring out ways to not have to "rebuild" every parser.
const parserMap = [
    {
        ruleset: "RULES",
        key: "defaultRules",
        react: "parse",
        ast: "parseToAST",
        reactOptions: { enableBuildOverrides: true },
    },
    {
        ruleset: "RULES",
        react: "parseForumPostGuidelines",
        omit: ["paragraph", "newline"],
    },
    {
        ruleset: "CHANNEL_TOPIC_RULES",
        react: "parseTopic",
        ast: "parseTopicToAST",
        reactOptions: { emojiTooltipPosition: "bottom" },
        overrides: { codeBlock: "text" },
    },
    {
        ruleset: "EMBED_TITLE_RULES",
        react: "parseEmbedTitle",
        ast: "parseEmbedTitleToAST",
    },
    {
        ruleset: "INLINE_REPLY_RULES",
        react: "parseInlineReply",
        ast: "parseInlineReplyToAST",
    },
    {
        ruleset: "GUILD_VERIFICATION_FORM_RULES",
        react: "parseGuildVerificationFormRule",
    },
    {
        ruleset: "GUILD_EVENT_RULES",
        key: "guildEventRules",
        react: "parseGuildEventDescription",
    },
    {
        ruleset: "INLINE_REPLY_RULES",
        react: "parseForumPostMostRecentMessage",
        reactOptions: { emoji: { height: 14, width: 14, lineHeight: 18 } },
    },
    {
        ruleset: "AUTO_MODERATION_SYSTEM_MESSAGE_RULES",
        react: "parseAutoModerationSystemMessage",
        ast: "parseAutoModerationSystemMessageToAST",
    },
    {
        ruleset: "RULES",
        key: "notifCenterV2MessagePreviewRules",
        react: "parseNotifCenterMessagePreview",
        reactOptions: { emoji: { height: 14, width: 14, lineHeight: 18 } },
        omit: ["paragraph", "newline", "strong", "codeBlock", "inlineCode", "u", "link", "url", "autolink", "list", "heading"],
    },
];
function __rebuildParsers() {
    for (const props of parserMap) {
        const customRules = __getCustomRules(props.ruleset);

        const reactOptions = props.reactOptions ? { ...Parser.defaultReactRuleOptions, ...props.reactOptions } : Parser.defaultReactRuleOptions;
        const overrides = {};
        if (props.overrides) {
            for (const [rule, override] of Object.entries(props.overrides)) {
                overrides[rule] = rulesets.RULES[override].react;
            }
        }

        let rules = { ...rulesets[props.ruleset], ...customRules };
        rules = Parser.combineAndInjectMentionRule(rules, [Parser.createReactRules(reactOptions), overrides]);
        if (props.omit) {
            window._.omit(rules, ...props.omit);
        }

        if (props.key) {
            Parser[props.key] = rules;
        }
        if (props.react) {
            Parser[props.react] = Parser.reactParserFor(rules);
        }
        if (props.ast) {
            Parser[props.ast] = Parser.astParserFor(rules);
        }
    }
}

export function __getSlateRule(rule: string): SlateRule | null | undefined {
    return slateRules.get(rule.substring(3));
}

export function __getSlateDecorator(rule: string): string | null | undefined {
    return slateDecorators.get(rule.substring(3));
}

let slateOverrides: Record<string, MarkdownRules>;
export function __setSlateOverrides(overrides: Record<string, MarkdownRules>): Record<string, MarkdownRules> {
    slateOverrides = overrides;

    return overrides;
}
let normalSlateRules: Record<string, SlateRule>;
export function __setSlateRules(rules: Record<string, SlateRule>): Record<string, SlateRule> {
    normalSlateRules = rules;

    return rules;
}

function __createSlateParser(rule: MarkdownRules) {
    const originalParse = rule.parse;

    return Object.assign({}, rule, {
        parse(capture, parse, state) {
            const ret = originalParse.call(this, capture, parse, state);
            if (!Array.isArray(ret)) {
                ret.originalMatch = capture;
            }

            return ret;
        }
    });
}

const inlineTextRule: MarkdownRules = findLazy(x=>x.match?.regex);
const slateParsers: Record<string, ASTParser> = {};
function __rebuildSlateParsers() {
    const customSlateRules = {};
    for (const [name, rule] of slateRules) {
        customSlateRules["vc_" + name] = rule;
    }

    const allRules = Object.assign({}, rulesets.RULES, __getCustomRules());
    const allSlateRules = Object.assign({}, normalSlateRules, customSlateRules);

    const parserRules = {};
    const inlineParserRules = {};

    for (const name of Object.keys(allRules)) {
        const rule = allRules[name];
        const slateRule = allSlateRules[name];

        if (slateRule.type !== "skip") {
            parserRules[name] = __createSlateParser(rule);
            if (slateRule.type !== "inlineObject") {
                inlineParserRules[name] = __createSlateParser(name === "text" ? inlineTextRule : rule);
            }
        }
    }

    // @ts-expect-error
    slateParsers.normal = Parser.astParserFor(Object.assign({}, parserRules, slateOverrides ?? {}));
    // @ts-expect-error
    slateParsers.inline = Parser.astParserFor(Object.assign({}, inlineParserRules, slateOverrides ?? {}));
}

export function __getSlateParsers(): Record<string, ASTParser> {
    return slateParsers;
}
