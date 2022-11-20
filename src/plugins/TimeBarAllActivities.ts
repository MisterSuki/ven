/*
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

import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

export default definePlugin({
    name: "TimeBarAllActivities",
    description: "Adds the Spotify time bar to all activities if they have start and end timestamps",
    authors: [Devs.obscurity],
    patches: [
        {
            find: "renderTimeBar=function",
            replacement: {
                match: /renderTimeBar=function\((.{1,3})\){.{0,50}var/,
                replace: "renderTimeBar=function($1){var"
            }
        }
    ],
});
