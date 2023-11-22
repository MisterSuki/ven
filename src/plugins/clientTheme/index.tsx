/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./clientTheme.css";

import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import { getTheme, Theme } from "@utils/discord";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import definePlugin, { OptionType, StartAt } from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy, findStoreLazy } from "@webpack";
import { Button, Forms, useStateFromStores } from "@webpack/common";

import lightModeFixes from "./lightModeFixes.css?managed";

const ColorPicker = findComponentByCodeLazy(".Messages.USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR");

const colorPresets = [
    "#1E1514", "#172019", "#13171B", "#1C1C28", "#402D2D",
    "#3A483D", "#344242", "#313D4B", "#2D2F47", "#322B42",
    "#3C2E42", "#422938", "#b6908f", "#bfa088", "#d3c77d",
    "#86ac86", "#88aab3", "#8693b5", "#8a89ba", "#ad94bb",
];

function onPickColor(color: number) {
    const hexColor = color.toString(16).padStart(6, "0");

    settings.store.color = hexColor;
    updateColorVars(hexColor);
}

const { saveClientTheme } = findByPropsLazy("saveClientTheme");

function swapTheme() {
    const isLightTheme = getTheme() === Theme.Light;
    saveClientTheme({ theme: isLightTheme ? "dark" : "light" });
}

const ThemeStore = findStoreLazy("ThemeStore");

function ThemeSettings() {
    const theme = useStateFromStores([ThemeStore], () => ThemeStore.theme);
    const isLightTheme = theme === "light";

    const selectedLightness = hexToLightness(settings.store.color);

    let contrastWarning, unFixableContrast = false;
    if ((isLightTheme && selectedLightness < 55) || !isLightTheme && selectedLightness > 40)
        contrastWarning = true;
    if (selectedLightness < 55 && selectedLightness > 40)
        unFixableContrast = true;
    // light mode with values greater than 70 leads to background colors getting crushed together and poor text contrast for muted channels
    if (isLightTheme && selectedLightness > 70) {
        contrastWarning = true;
        unFixableContrast = true;
    }

    return (
        <div className="client-theme-settings">
            <div className="client-theme-container">
                <div className="client-theme-settings-labels">
                    <Forms.FormTitle tag="h3">Theme Color</Forms.FormTitle>
                    <Forms.FormText>Add a color to your Discord client theme</Forms.FormText>
                </div>
                <ColorPicker
                    color={parseInt(settings.store.color, 16)}
                    onChange={onPickColor}
                    showEyeDropper={false}
                    suggestedColors={colorPresets}
                />
            </div>
            {contrastWarning
                ? <div>
                    <Forms.FormDivider className={classes(Margins.top8, Margins.bottom8)} />
                    <Forms.FormText className="client-theme-warning">Your theme won't look good:</Forms.FormText>
                    <Forms.FormText className="client-theme-warning">Selected color won't contrast well with text</Forms.FormText>
                    {!unFixableContrast && <Button onClick={swapTheme}>Swap Theme</Button>}
                </div>
                : null
            }
        </div>
    );
}

const settings = definePluginSettings({
    color: {
        description: "Color your Discord client theme will be based around. Light mode isn't supported",
        type: OptionType.COMPONENT,
        default: "313338",
        component: () => <ThemeSettings />
    },
    resetColor: {
        description: "Reset Theme Color",
        type: OptionType.COMPONENT,
        default: "313338",
        component: () => (
            <Button onClick={() => onPickColor(0x313338)}>
                Reset Theme Color
            </Button>
        )
    }
});

export default definePlugin({
    name: "ClientTheme",
    authors: [Devs.F53, Devs.Nuckyz],
    description: "Recreation of the old client theme experiment. Add a color to your Discord client theme",
    settings,

    startAt: StartAt.DOMContentLoaded,
    start() {
        enableStyle(lightModeFixes);
        updateColorVars(settings.store.color);
        generateColorOffsets();
    },

    stop() {
        disableStyle(lightModeFixes);
        document.getElementById("clientThemeVars")?.remove();
        document.getElementById("clientThemeOffsets")?.remove();
    }
});

const variableRegex = /(--primary-\d{3}-hsl):.*?(\S*)%;/g;
const lightVariableRegex = /^--primary-[1-5]\d{2}-hsl/g;
const darkVariableRegex = /^--primary-[5-9]\d{2}-hsl/g;

// generates variables per theme by:
// - matching regex (so we can limit what variables are included in light/dark theme, otherwise text becomes unreadable)
// - offset from specified center (light/dark theme get different offsets because light uses 100 for background-primary, while dark uses 600)
function genThemeSpecificOffsets(variableLightness: Record<string, number>, regex: RegExp, centerVariable: string): string {
    return Object.entries(variableLightness).filter(([key]) => key.search(regex) > -1)
        .map(([key, lightness]) => {
            const lightnessOffset = lightness - variableLightness[centerVariable];
            const plusOrMinus = lightnessOffset >= 0 ? "+" : "-";
            return `${key}: var(--theme-h) var(--theme-s) calc(var(--theme-l) ${plusOrMinus} ${Math.abs(lightnessOffset).toFixed(2)}%);`;
        })
        .join("");
}

async function generateColorOffsets() {
    const styleLinkNodes = document.querySelectorAll('link[rel="stylesheet"]');
    const variableLightness = {} as Record<string, number>;

    // Search all stylesheets for color variables
    for (const styleLinkNode of styleLinkNodes) {
        const cssLink = styleLinkNode.getAttribute("href");
        if (!cssLink) continue;

        const res = await fetch(cssLink);
        const cssString = await res.text();

        // Get lightness values of --primary variables
        let variableMatch = variableRegex.exec(cssString);
        while (variableMatch !== null) {
            const [, variable, lightness] = variableMatch;
            variableLightness[variable] = parseFloat(lightness);
            variableMatch = variableRegex.exec(cssString);
        }
    }

    const style = document.createElement("style");
    style.setAttribute("id", "clientThemeOffsets");
    style.textContent = `.theme-light.theme-light { ${genThemeSpecificOffsets(variableLightness, lightVariableRegex, "--primary-345-hsl")} }`;
    style.textContent += `.theme-dark.theme-dark { ${genThemeSpecificOffsets(variableLightness, darkVariableRegex, "--primary-600-hsl")} }`;
    style.textContent = style.textContent.trim();

    document.head.appendChild(style);
}

function updateColorVars(color: string) {
    const { hue, saturation, lightness } = hexToHSL(color);

    let style = document.getElementById("clientThemeVars");
    if (!style) {
        style = document.createElement("style");
        style.setAttribute("id", "clientThemeVars");
        document.head.appendChild(style);
    }

    style.textContent = `:root {
        --theme-h: ${hue};
        --theme-s: ${saturation}%;
        --theme-l: ${lightness}%;
    }`;
}

// https://css-tricks.com/converting-color-spaces-in-javascript/
function hexToHSL(hexCode: string) {
    // Hex => RGB normalized to 0-1
    const r = parseInt(hexCode.substring(0, 2), 16) / 255;
    const g = parseInt(hexCode.substring(2, 4), 16) / 255;
    const b = parseInt(hexCode.substring(4, 6), 16) / 255;

    // RGB => HSL
    const cMax = Math.max(r, g, b);
    const cMin = Math.min(r, g, b);
    const delta = cMax - cMin;

    let hue: number, saturation: number, lightness: number;

    lightness = (cMax + cMin) / 2;

    if (delta === 0) {
        // If r=g=b then the only thing that matters is lightness
        hue = 0;
        saturation = 0;
    } else {
        // Magic
        saturation = delta / (1 - Math.abs(2 * lightness - 1));

        if (cMax === r)
            hue = ((g - b) / delta) % 6;
        else if (cMax === g)
            hue = (b - r) / delta + 2;
        else
            hue = (r - g) / delta + 4;
        hue *= 60;
        if (hue < 0)
            hue += 360;
    }

    // Move saturation and lightness from 0-1 to 0-100
    saturation *= 100;
    lightness *= 100;

    return { hue, saturation, lightness };
}

// Minimized math just for lightness, lowers lag when changing colors
function hexToLightness(hexCode: string) {
    // Hex => RGB normalized to 0-1
    const r = parseInt(hexCode.substring(0, 2), 16) / 255;
    const g = parseInt(hexCode.substring(2, 4), 16) / 255;
    const b = parseInt(hexCode.substring(4, 6), 16) / 255;

    const cMax = Math.max(r, g, b);
    const cMin = Math.min(r, g, b);

    const lightness = 100 * ((cMax + cMin) / 2);

    return lightness;
}
