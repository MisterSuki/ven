/*!
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

export * as Plugins from "./plugins";
export * as Webpack from "./webpack";
export * as Api from "./api";
export * as Updater from "./utils/updater";
export * as QuickCss from "./utils/quickCss";
export * as Util from "./utils";

import { popNotice, showNotice } from "./api/Notices";
import { Settings, PlainSettings } from "./api/settings";
import { startAllPlugins } from "./plugins";

export { Settings, PlainSettings };

import "./webpack/patchWebpack";
import "./utils/quickCss";
import { checkForUpdates, UpdateLogger } from "./utils/updater";
import { onceReady } from "./webpack";
import { Router } from "./webpack/common";

export let Components: any;

async function init() {
    await onceReady;
    startAllPlugins();
    Components = await import("./components");

    if (!IS_WEB) {
        try {
            const isOutdated = await checkForUpdates();
            if (isOutdated && Settings.notifyAboutUpdates)
                setTimeout(() => {
                    showNotice(
                        "A Vencord update is available!",
                        "View Update",
                        () => {
                            popNotice();
                            Router.open("VencordUpdater");
                        }
                    );
                }, 10000);
        } catch (err) {
            UpdateLogger.error("Failed to check for updates", err);
        }
    }
}

init();
