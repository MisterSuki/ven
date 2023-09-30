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

import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { DeleteIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, React, TextInput, useState } from "@webpack/common";

const STRING_RULES_KEY = "TextReplace_rulesString";
const REGEX_RULES_KEY = "TextReplace_rulesRegex";
const PLUGIN_NAME = "TextReplace";

type Rule = Record<"find" | "replace" | "onlyIfIncludes", string>;

interface TextReplaceProps {
    title: string;
    rulesArray: Rule[];
    rulesKey: string;
    update: () => void;
}

interface Rules {
    TextReplace_rulesString: Rule[];
    TextReplace_rulesRegex: Rule[];
}

const makeEmptyRule: () => Rule = () => ({
    find: "",
    replace: "",
    onlyIfIncludes: ""
});
const makeEmptyRuleArray = () => [makeEmptyRule()];

let stringRules = makeEmptyRuleArray();
let regexRules = makeEmptyRuleArray();

const settings = definePluginSettings({
    rules: {
        type: OptionType.COMPONENT,
        description: "Allows the user to define two different kinds of rule sets (string based and regex based).",
        component: RulesComponent
    }
});

function RulesComponent() {
    const update = useForceUpdater();
    return (
        <>
            <TextReplace
                title="Using String"
                rulesArray={stringRules}
                rulesKey={STRING_RULES_KEY}
                update={update}
            />
            <TextReplace
                title="Using Regex"
                rulesArray={regexRules}
                rulesKey={REGEX_RULES_KEY}
                update={update}
            />
            <TextReplaceTesting />
        </>
    );
}

function stringToRegex(str: string) {
    const match = str.match(/^(\/)?(.+?)(?:\/([gimsuy]*))?$/); // Regex to match regex
    return match
        ? new RegExp(
            match[2], // Pattern
            match[3]
                ?.split("") // Remove duplicate flags
                .filter((char, pos, flagArr) => flagArr.indexOf(char) === pos)
                .join("")
            ?? "g"
        )
        : new RegExp(str); // Not a regex, return string
}

function renderFindError(find: string) {
    try {
        stringToRegex(find);
        return null;
    } catch (e) {
        return (
            <span style={{ color: "var(--text-danger)" }}>
                {String(e)}
            </span>
        );
    }
}

function Input({ initialValue, onChange, placeholder }: {
    placeholder: string;
    initialValue: string;
    onChange(value: string): void;
}) {
    const [value, setValue] = useState(initialValue);
    return (
        <TextInput
            placeholder={placeholder}
            value={value}
            onChange={setValue}
            spellCheck={false}
            onBlur={() => value !== initialValue && onChange(value)}
        />
    );
}

function TextReplace({ title, rulesArray, rulesKey, update }: TextReplaceProps) {
    const isRegexRules = title === "Using Regex";

    async function onClickRemove(index: number) {
        if (index === rulesArray.length - 1) return;
        rulesArray.splice(index, 1);

        saveRulesInSettingsJson();
        update();
    }

    async function onChange(e: string, index: number, key: string) {
        if (index === rulesArray.length - 1)
            rulesArray.push(makeEmptyRule());

        rulesArray[index][key] = e;

        if (rulesArray[index].find === "" && rulesArray[index].replace === "" && rulesArray[index].onlyIfIncludes === "" && index !== rulesArray.length - 1)
            rulesArray.splice(index, 1);

        saveRulesInSettingsJson();
        update();
    }

    return (
        <>
            <Forms.FormTitle tag="h4">{title}</Forms.FormTitle>
            <Flex flexDirection="column" style={{ gap: "0.5em" }}>
                {
                    rulesArray.map((rule, index) =>
                        <React.Fragment key={`${rule.find}-${index}`}>
                            <Flex flexDirection="row" style={{ gap: 0 }}>
                                <Flex flexDirection="row" style={{ flexGrow: 1, gap: "0.5em" }}>
                                    <Input
                                        placeholder="Find"
                                        initialValue={rule.find}
                                        onChange={e => onChange(e, index, "find")}
                                    />
                                    <Input
                                        placeholder="Replace"
                                        initialValue={rule.replace}
                                        onChange={e => onChange(e, index, "replace")}
                                    />
                                    <Input
                                        placeholder="Only if includes"
                                        initialValue={rule.onlyIfIncludes}
                                        onChange={e => onChange(e, index, "onlyIfIncludes")}
                                    />
                                </Flex>
                                <Button
                                    size={Button.Sizes.MIN}
                                    onClick={() => onClickRemove(index)}
                                    style={{
                                        background: "none",
                                        color: "var(--status-danger)",
                                        ...(index === rulesArray.length - 1
                                            ? {
                                                visibility: "hidden",
                                                pointerEvents: "none"
                                            }
                                            : {}
                                        )
                                    }}
                                >
                                    <DeleteIcon />
                                </Button>
                            </Flex>
                            {isRegexRules && renderFindError(rule.find)}
                        </React.Fragment>
                    )
                }
            </Flex>
        </>
    );
}

function TextReplaceTesting() {
    const [value, setValue] = useState("");
    return (
        <>
            <Forms.FormTitle tag="h4">Test Rules</Forms.FormTitle>
            <TextInput placeholder="Type a message" onChange={setValue} />
            <TextInput placeholder="Message with rules applied" editable={false} value={applyRules(value)} />
        </>
    );
}

function getRulesFromSettingsJson() {
    stringRules = Vencord.Settings.plugins[PLUGIN_NAME].rules[STRING_RULES_KEY] ?? makeEmptyRuleArray();
    regexRules = Vencord.Settings.plugins[PLUGIN_NAME].rules[REGEX_RULES_KEY] ?? makeEmptyRuleArray();
    if (stringRules[stringRules.length - 1].find !== "") {
        stringRules.push(makeEmptyRule());
    }
    if (regexRules[regexRules.length - 1].find !== "") {
        regexRules.push(makeEmptyRule());
    }
}

function saveRulesInSettingsJson() {
    const RULES: Rules = { TextReplace_rulesString: stringRules, TextReplace_rulesRegex: regexRules };
    Vencord.Settings.plugins[PLUGIN_NAME].rules = RULES;
}

function applyRules(content: string): string {
    if (content.length === 0)
        return content;

    if (stringRules) {
        for (const rule of stringRules) {
            if (!rule.find || !rule.replace) continue;
            if (rule.onlyIfIncludes && !content.includes(rule.onlyIfIncludes)) continue;

            content = ` ${content} `.replaceAll(rule.find, rule.replace.replaceAll("\\n", "\n")).replace(/^\s|\s$/g, "");
        }
    }

    if (regexRules) {
        for (const rule of regexRules) {
            if (!rule.find || !rule.replace) continue;
            if (rule.onlyIfIncludes && !content.includes(rule.onlyIfIncludes)) continue;

            try {
                const regex = stringToRegex(rule.find);
                content = content.replace(regex, rule.replace.replaceAll("\\n", "\n"));
            } catch (e) {
                new Logger("TextReplace").error(`Invalid regex: ${rule.find}`);
            }
        }
    }

    content = content.trim();
    return content;
}

const TEXT_REPLACE_RULES_CHANNEL_ID = "1102784112584040479";

export default definePlugin({
    name: "TextReplace",
    description: "Replace text in your messages. You can find pre-made rules in the #textreplace-rules channel in Vencord's Server. If you want your rule changes to get imported from the settings.json, you need to reload Discord (CTRL + R).",
    authors: [Devs.AutumnVN, Devs.TheKodeToad, Devs.hendrik3812],
    dependencies: ["MessageEventsAPI"],

    settings,

    async start() {
        getRulesFromSettingsJson();
        if (!("rules" in Vencord.Settings.plugins[PLUGIN_NAME])) {
            // If the "rules" key doesn't exist in the settings.json yet, create it at startup so users can directly start defining their rules in the settings.json using a blank template.
            saveRulesInSettingsJson();
        }

        this.preSend = addPreSendListener((channelId, msg) => {
            // Channel used for sharing rules, applying rules here would be messy
            if (channelId === TEXT_REPLACE_RULES_CHANNEL_ID) return;
            msg.content = applyRules(msg.content);
        });
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
