/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { Logger } from "@utils/Logger";
import { Toasts } from "@webpack/common";

import { Rule } from "./type";

function makeEmptyRule() {
    return {
        isEnabled: true,
        find: "",
        replace: "",
        onlyIfIncludes: "",
        isRegex: false,
        id: random()
    };
}

function makeEmptyRuleArray() {
    return [makeEmptyRule()];
}

function random() {
    return `${Date.now()}${Math.random()}`;
}

function applyRule(rule: Rule, content: string): string {
    if (!rule.isEnabled || !rule.find) return content;
    if (rule.isRegex) {
        if (rule.onlyIfIncludes) {
            try {
                const onlyIfIncludesRegex = stringToRegex(rule.onlyIfIncludes);
                if (!onlyIfIncludesRegex.test(content)) return content;
            } catch (e) {
                new Logger("TextReplace").error(`Invalid regex: ${rule.onlyIfIncludes}`);
            }
        }
        try {
            const regex = stringToRegex(rule.find);
            content = content.replace(regex, rule.replace.replaceAll("\\n", "\n"));
        } catch (e) {
            new Logger("TextReplace").error(`Invalid regex: ${rule.find}`);
        }
    } else if (!rule.onlyIfIncludes || content.includes(rule.onlyIfIncludes)) {
        content = ` ${content} `.replaceAll(rule.find, rule.replace.replaceAll("\\n", "\n")).replace(/^\s|\s$/g, "");
    }
    return content;
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

async function tryImport(textReplaceRules: Rule[], textReplaceKey: string, str: string, update: () => void) {
    try {
        const data = JSON.parse(str);
        for (const rule of data) {
            if (typeof rule.isEnabled !== "boolean") throw new Error("A rule is missing isEnabled.");
            if (typeof rule.find !== "string") throw new Error("A rule is missing find.");
            if (typeof rule.replace !== "string") throw new Error("A rule is missing replace.");
            if (typeof rule.onlyIfIncludes !== "string") throw new Error("A rule is missing onlyIfIncludes.");
            if (typeof rule.isRegex !== "boolean") throw new Error("A rule is missing isRegex.");

            if (textReplaceRules.find(r => r.find === rule.find && r.replace === rule.replace && r.onlyIfIncludes === rule.onlyIfIncludes && r.isRegex === rule.isRegex)) continue;

            rule.id = random();

            textReplaceRules.push(rule);
            await DataStore.set(textReplaceKey, textReplaceRules);
            update();
        }
        Toasts.show({
            type: Toasts.Type.SUCCESS,
            message: "Successfully imported & merged text replace rules.",
            id: Toasts.genId()
        });
    } catch (err) {
        new Logger("TextReplace").error(err);
        Toasts.show({
            type: Toasts.Type.FAILURE,
            message: "Failed to import text replace rules: " + String(err),
            id: Toasts.genId()
        });
    }
}

export { applyRule, makeEmptyRule, makeEmptyRuleArray, random, stringToRegex, tryImport };
