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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "IrcColors",
    description: "Makes username colors in chat unique, like in IRC clients",
    authors: [Devs.Grzesiek11],
    patches: [
        {
            find: "=\"SYSTEM_TAG\"",
            replacement: {
                match: /style:"username"===\i&&null!=\i\?{color:\i}:void 0/,
                replace: "style:{color:$self.calculateNameColor(BigInt(arguments[0].message.author.id))}"
            },
        },
    ],
    // Calculate a CSS color string based on the user ID
    calculateNameColor(id: bigint) {
        // Compute a 64-bit FNV-1a hash of the passed data
        function hash(data: ArrayBuffer) {
            const fnvPrime = 1099511628211n;
            const offsetBasis = 14695981039346656037n;

            let result = offsetBasis;
            for (const byte of new Uint8Array(data)) {
                result ^= BigInt(byte);
                result = (result * fnvPrime) % 2n**32n;
            }

            return result;
        }

        const idBuffer = new ArrayBuffer(16);
        {
            const idView = new DataView(idBuffer);
            idView.setBigUint64(0, id);
        }
        const idHash = hash(idBuffer);

        return `hsl(${idHash % 360n}, 100%, 70%)`;
    },
});
