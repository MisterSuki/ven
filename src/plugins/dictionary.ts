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

import { ApplicationCommandOptionType, sendBotMessage } from "../api/Commands";
import { ApplicationCommandInputType } from "../api/Commands/types";
import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

export default definePlugin({
    name: "Urban Dictionary",
    description: "Searches for a word on Urban Dictionary",
    authors: [Devs.jewdev],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "urban",
            description: "Returns the definition of a word from Urban Dictionary",
            inputType: ApplicationCommandInputType.BOT,
            options: [
                {
                    type: ApplicationCommandOptionType.STRING,
                    name: "word",
                    description: "The word to search for on Urban Dictionary",
                    required: true
                }
            ],
            execute: async (args, ctx) => {
                try {
                    const { list: [definition] } = await (await fetch(`https://api.urbandictionary.com/v0/define?term=${args[0].value}`)).json();

                    if (!definition)
                        return void sendBotMessage(ctx.channel.id, { content: "No results found." });

                    return void sendBotMessage(ctx.channel.id, {
                        embeds: [
                            {
                                author: {
                                    name: definition.word,
                                    url: definition.permalink
                                },
                                title: definition.definition,
                                description: `Example:\n${definition.example}`,
                                color: 0xFF9900,
                                footer: { text: `👍 ${definition.thumbs_up} | 👎 ${definition.thumbs_down}`, icon_url: "https://www.urbandictionary.com/favicon.ico" },
                                timestamp: new Date(definition.written_on).toISOString()
                            }
                        ] as any
                    });
                } catch (error) {
                    return void sendBotMessage(ctx.channel.id, {
                        content: `Something went wrong: \`${error}\``
                    });
                }
            }
        }
    ]
});
