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

export async function translate(kind: "received" | "sent", text: string): Promise<TranslationValue> {
    const sourceLang = settings.store[kind + "Input"];
    const targetLang = settings.store[kind + "Output"];
    const { service } = settings.store;

    // DeepL not supported on web due to CORS policy
    if (IS_DISCORD_DESKTOP && service !== "google") {
        if (!settings.store.deeplApiKey) {
            showToast("DeepL API key is not set", Toasts.Type.FAILURE);
            throw new Error("DeepL API key is not set");
        }

        try {
            // CORS jumpscare
            const { status, data } = await Native.makeRequest(service === "deepl-pro", settings.store.deeplApiKey, JSON.stringify({
                text: [text],
                target_lang: targetLang
            }));

            switch (status) {
                case 200:
                    break;
                case 403:
                    showToast("Invalid DeepL API key or version", Toasts.Type.FAILURE);
                    throw new Error("Invalid DeepL API key");
                case 456:
                    showToast("DeepL API quota exceeded", Toasts.Type.FAILURE);
                    throw new Error("DeepL API quota exceeded");
                default:
                    throw new Error(
                        `Failed to translate "${text}" (${sourceLang} -> ${targetLang})`
                        + `\n${status} ${data}`
                    );
            }

            const { translations }: DeepLData = JSON.parse(data);

            return { src: translations[0].detected_source_language, text: translations[0].text };
        } catch (e) {
            console.error(e);
            throw new Error("Failed to translate text");
        }
    }

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
