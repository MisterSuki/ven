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

import { classNameFactory } from "@api/Styles";
import { PluginNative } from "@utils/types";
import { showToast, Toasts } from "@webpack/common";

import { settings } from "./settings";

export const cl = classNameFactory("vc-trans-");

const Native = VencordNative.pluginHelpers.Translate as PluginNative<typeof import("./native")>;

interface GoogleData {
    src: string;
    sentences: {
        // 🏳️‍⚧️
        trans: string;
    }[];
}

interface DeepLData {
    translations: {
        detected_source_language: string;
        text: string;
    }[];
}

export interface TranslationValue {
    src: string;
    text: string;
}

export function translate(kind: "received" | "sent", text: string): Promise<TranslationValue> {
    const translate = IS_WEB || settings.store.service === "google"
        ? googleTranslate
        : deeplTranslate;

    try {
        return translate(
            text,
            settings.store[`${kind}Input`],
            settings.store[`${kind}Output`]
        );
    } catch (e) {
        const userMessage = typeof e === "string"
            ? e
            : "Something went wrong. If this issue persists, please check the console or ask for help in the support server.";

        showToast(userMessage, Toasts.Type.FAILURE);

        throw e instanceof Error
            ? e
            : new Error(userMessage);
    }
}

async function googleTranslate(text: string, sourceLang: string, targetLang: string): Promise<TranslationValue> {
    const url = "https://translate.googleapis.com/translate_a/single?" + new URLSearchParams({
        // see https://stackoverflow.com/a/29537590 for more params
        // holy shidd nvidia
        client: "gtx",
        // source language
        sl: sourceLang,
        // target language
        tl: targetLang,
        // what to return, t = translation probably
        dt: "t",
        // Send json object response instead of weird array
        dj: "1",
        source: "input",
        // query, duh
        q: text
    });

    const res = await fetch(url);
    if (!res.ok)
        throw new Error(
            `Failed to translate "${text}" (${sourceLang} -> ${targetLang})`
            + `\n${res.status} ${res.statusText}`
        );

    const { src, sentences }: GoogleData = await res.json();

    return {
        src,
        text: sentences.
            map(s => s?.trans).
            filter(Boolean).
            join("")
    };
}

async function deeplTranslate(text: string, sourceLang: string, targetLang: string): Promise<TranslationValue> {
    if (!settings.store.deeplApiKey) {
        showToast("DeepL API key is not set", Toasts.Type.FAILURE);
        throw new Error("DeepL API key is not set");
    }

    // CORS jumpscare
    const { status, data } = await Native.makeDeeplTranslateRequest(settings.store.service === "deepl-pro", settings.store.deeplApiKey, JSON.stringify({
        text: [text],
        target_lang: targetLang,
        source_lang: sourceLang.split("-")[0]
    }));

    switch (status) {
        case 200:
            break;
        case -1:
            throw "Failed to connect to DeepL API: " + data;
        case 403:
            throw "Invalid DeepL API key or version";
        case 456:
            throw "DeepL API quota exceeded";
        default:
            throw new Error(`Failed to translate "${text}" (${sourceLang} -> ${targetLang})\n${status} ${data}`);
    }

    const { translations }: DeepLData = JSON.parse(data);
    return { src: translations[0].detected_source_language, text: translations[0].text };
}
