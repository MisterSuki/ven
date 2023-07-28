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

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import { getTheme, insertTextIntoChatInputBox, Theme } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { Button, ButtonLooks, ButtonWrapperClasses, Forms, React, TextInput, Tooltip, useState } from "@webpack/common";
import { Channel } from "discord-types/general";
import { SevenTVBadges } from "./badges";
import { Logger } from "@utils/Logger";

const cl = classNameFactory("vc-seventv-");

interface SevenTVEmote {
    name: string;
    animated: boolean;
    host: SevenTVHost;
}
interface SevenTVHost {
    url: string;
}

let emotes: SevenTVEmote[] = [];
let searching: boolean = false;
let page: number = 1;
let lastApiCall = 0;
let lastError = "";
const MINIMUM_API_DELAY = 500;
const API_URL = "https://7tv.io/v3";
let savedvalue = "";

const SevenTVLogger = new Logger("7TV");

const cachedBadges = {};

function GetEmoteURL(emote: SevenTVEmote) {
    const extension = emote.animated ? "gif" : "webp";

    return "https:" + emote.host.url + "/" + settings.store.imagesize + "." + extension + "?name=" + emote.name;
}

async function FetchEmotes(value, handleRefresh) {
    const currentTime = Date.now();
    const timeSinceLastCall = currentTime - lastApiCall;
    if (timeSinceLastCall < MINIMUM_API_DELAY)
        return;

    lastApiCall = currentTime;

    lastError = "";
    searching = true;
    const query = `query SearchEmotes($query: String!, $page: Int, $sort: Sort, $limit: Int, $filter: EmoteSearchFilter) {
        emotes(query: $query, page: $page, sort: $sort, limit: $limit, filter: $filter) {
          items {
            id
            name
            animated
            host {
              url
            }
          }
        }
      }`;

    if (page < 1) page = 1;

    let variables = {};
    if (value !== "" && value !== undefined)
        variables = {
            "query": value,
            "limit": settings.store.limit,
            "page": page,
            "sort": {
                "value": settings.store.sort_value,
                "order": settings.store.sort_order
            },
            "filter": {
                "category": settings.store.category,
                "exact_match": settings.store.exact_match,
                "case_sensitive": settings.store.case_sensitive,
                "ignore_tags": settings.store.ignore_tags,
                "zero_width": settings.store.zero_width,
                "animated": settings.store.animated,
                "aspect_ratio": ""
            }
        };
    else
        variables = {
            "query": "",
            "limit": settings.store.limit,
            "page": page,
            "sort": {
                "value": settings.store.sort_value,
                "order": settings.store.sort_order
            },
            "filter": {
                "category": settings.store.category
            }
        };

    fetch(API_URL + "/gql", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ query, variables })
    }).then(response => response.json())
        .then(data => {
            if (data.data.emotes != null)
                emotes = data.data.emotes.items;
            else
                lastError = data.errors[0].message;
            searching = false;
            handleRefresh();
        })
        .catch(error => { SevenTVLogger.error(error); searching = false; });
}

async function getSevenTVDiscord(id) {
    try {
        const response = await fetch(API_URL + "/users/DISCORD/" + id, {
            method: "GET",
            headers: { "Accept": "application/json" },
        });
        const data = await response.json();

        if (data.user?.id != null) {
            return data.user.id;
        } else {
            return null;
        }
    } catch (error) {
        SevenTVLogger.error(error);
    }
    return null;
}

export function hasBadge(id, name) {
    checkBadge(id, name);

    if (cachedBadges[name] == null)
        return false;

    return cachedBadges[name][id];
}

async function checkBadge(id, name) {
    let sevenTvId = await getSevenTVDiscord(id);
    if (sevenTvId == null)
        return;

    const query = `query GetUserCurrentCosmetics($id: ObjectID!) {
        user(id: $id) {
            id
            username
            display_name
            style {
                paint{
                    id
                    kind
                    name
                }
                badge {
                    id
                    kind
                    name
                    host {
                        url
                        files{
                            name
                        }
                    }
                }
            }

        }
    }`;
    let variables = {
        "id": sevenTvId
    };

    try {
        const response = await fetch(API_URL + "/gql", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({ query, variables }),
        });
        const data = await response.json();

        if (!data.data)
            return;

        if (data.data.user.style.badge?.name == name) {
            if (!cachedBadges[name])
                cachedBadges[name] = {};

            cachedBadges[name][id] = true;
            return;
        }
    } catch (error) {
        SevenTVLogger.error(error);
    }

    if (!cachedBadges[name])
        cachedBadges[name] = {};
    cachedBadges[name][id] = false;
}

const settings = definePluginSettings({
    show_badges: {
        type: OptionType.BOOLEAN,
        description: "Display 7TV Badges",
        default: true,
        restartNeeded: true
    },
    exact_match: {
        type: OptionType.BOOLEAN,
        description: "Search only for emotes that have EXACTLY the same name as provided",
        default: true,
    },
    case_sensitive: {
        type: OptionType.BOOLEAN,
        description: "Search only for emotes that have the same casing as provided",
        default: false,
    },
    ignore_tags: {
        type: OptionType.BOOLEAN,
        description: "Ignore emote tags",
        default: false,
    },
    zero_width: {
        type: OptionType.BOOLEAN,
        description: "Search for zero-width emotes (You can't overlap emotes on Discord)",
        default: false,
    },
    animated: {
        type: OptionType.BOOLEAN,
        description: "Search ONLY for animated emotes",
        default: false,
    },
    limit: {
        type: OptionType.NUMBER,
        description: "How many emotes per page?",
        default: 42,
    },
    category: {
        type: OptionType.SELECT,
        description: "In which category to search for emotes?",
        options: [
            { label: "TOP", value: "TOP", default: true },
            { label: "TRENDING", value: "TRENDING_DAY" }
        ],
    },
    sort_value: {
        type: OptionType.SELECT,
        description: "Sort by:",
        options: [
            { label: "Popularity", value: "popularity", default: true },
            { label: "Date Created", value: "date_created" }
        ],
    },
    sort_order: {
        type: OptionType.SELECT,
        description: "",
        options: [
            { label: "Descending", value: "DESCENDING", default: true },
            { label: "Ascending", value: "ASCENDING" }
        ],
    },
    imagesize: {
        type: OptionType.SELECT,
        description: "Default image size:",
        options: [
            { label: "1x", value: "1x", default: true },
            { label: "2x", value: "2x" },
            { label: "3x", value: "3x" },
            { label: "4x", value: "4x" }
        ],
    }
});

export default definePlugin({
    name: "7TV",
    description: "Search for 7TV Emotes in your Discord Client!",
    authors: [Devs.Xslash, Devs.Arjix],

    patches: [
        {
            find: ".Messages.EXPRESSION_PICKER_GIF",
            replacement: [
                {
                    match: /null==\(null===\(\w=\w\.emojis\)\|\|void 0.*?\.consolidateGifsStickersEmojis.*?(\w)\.push\((\(0,\w\.jsx\))\((\w+),{disabled:\w,type:(\w)},"emoji"\)\)/,
                    replace: (m, btnArray, jsx, compo, type) => {
                        const c = "arguments[0].type";
                        return `${m};(${c}?.submit?.button||${c}?.attachments)&&${btnArray}.push(${jsx}(${compo},{disabled:!(${c}?.submit?.button||${c}?.attachments),type:${type},emojiType:"7TV"},"7TV"))`;
                    }
                },
                {
                    match: /(\.Messages\.PREMIUM_TRIAL_TUTORIAL_EMOJI_TOOLTIP.*?;return.*?,\w+\(\)\.buttonContainer.*?children:\(0,\w+\.jsx\)\()(.*?)(,.*?active:((\w).*?),)/,
                    replace: (_, head, comp, tail, emojiActive, activeView) => {
                        const isSevenTv = "arguments[0]?.emojiType===\"7TV\"";
                        const isActive = `(${isSevenTv}&&${activeView}==="7TV")||${emojiActive}`;
                        const rest = tail.replace(emojiActive, isActive);

                        return `${head}(${isSevenTv}?$self.chatBarIcon:${comp})${rest}`;
                    }
                },
                {
                    match: /(var \w=)(\w\.useCallback\(\(function\(\)\{\(0,\w+\.\w+\)\(.*?\.EMOJI,.*?);/,
                    replace: (_, decl, cb) => {
                        const newCb = cb.replace(/(?<=function\(\)\{\(.*?\)\().+?\.EMOJI/, "\"7TV\"");
                        return `${decl}arguments[0]?.emojiType?${newCb}:${cb};`;
                    }
                },
                {
                    match: /role:"tablist",.{10,20}\.Messages\.EXPRESSION_PICKER_CATEGORIES_A11Y_LABEL,children:\[.*?\)\]}\)}\):null,.*?onSelectEmoji:\w.*?:null/s,
                    replace: m => {
                        const stickerTabRegex = /,(\(0,\w\.jsx\))\((\w+?),\{.{50,100}isActive:(\w)===.*?\.EMOJI,\s*?viewType:.*?EXPRESSION_PICKER_EMOJI}\)/;
                        const res = m.replace(stickerTabRegex, (_m, jsx, tabHeaderComp, currentTab, stickerText) => {
                            const isActive = `${currentTab}==="7TV"`;
                            return (
                                `${_m},${jsx}(${tabHeaderComp},{id:"seventv-picker-tab","aria-controls":"seventv-picker-tab-panel","aria-selected":${isActive},isActive:${isActive},autoFocus:true,viewType:"7TV",children:${jsx}("div",{children:"7TV"})})`
                            );
                        });

                        return res.replace(/(\w)===.{1,10}\.EMOJI\?(\(0,\w\.jsx\)).*?(\{.*?\})\):null/, (_, currentTab, jsx, props) => {
                            return `${_},${currentTab}==="7TV"?${jsx}($self.SevenTVComponent,${props}):null`;
                        });
                    }
                }
            ]
        }
    ],
    settings,

    SevenTVComponent({
        channel,
        closePopout
    }: {
        channel: Channel,
        closePopout: () => void;
    }) {
        const [value, setValue] = useState<string>();
        const [count, setCount] = useState(0);

        const handleRefresh = () => {
            setCount(count + 1);
        };

        if ((value === undefined) && (savedvalue !== "undefined" && savedvalue !== ""))
            setValue(savedvalue);
        savedvalue = value + "";

        if (emotes.length === 0)
            FetchEmotes(value, handleRefresh);

        return (
            <div className={cl("picker")}>
                <div className={cl("picker-content")}>
                    <div className={cl("navigation-shadow")}>
                        <div className={cl("navigation")}>
                            <TextInput className={cl("searchinput")}
                                type="string"
                                value={value}
                                onChange={e => setValue(e)}
                                placeholder="Search 7TV Emotes"
                                spellCheck="false"
                                style={{
                                    colorScheme: getTheme() === Theme.Light ? "light" : "dark",
                                }}
                                onKeyDown={e => {
                                    if (e.key === "Enter")
                                        if (!searching) {
                                            page = 1;
                                            FetchEmotes(value, handleRefresh);
                                        }
                                }}
                            />
                            <div className={cl("searchbutton")} style={{
                                boxSizing: "border-box"
                            }} onClick={() => {
                                if (!searching) {
                                    page = 1;
                                    FetchEmotes(value, handleRefresh);
                                }
                            }}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="24px" height="24px">
                                    <path fill="#b5bac1" d="M 21 3 C 11.621094 3 4 10.621094 4 20 C 4 29.378906 11.621094 37 21 37 C 24.710938 37 28.140625 35.804688 30.9375 33.78125 L 44.09375 46.90625 L 46.90625 44.09375 L 33.90625 31.0625 C 36.460938 28.085938 38 24.222656 38 20 C 38 10.621094 30.378906 3 21 3 Z M 21 5 C 29.296875 5 36 11.703125 36 20 C 36 28.296875 29.296875 35 21 35 C 12.703125 35 6 28.296875 6 20 C 6 11.703125 12.703125 5 21 5 Z" />
                                </svg>
                            </div>
                        </div>
                    </div>



                    <Forms.FormDivider></Forms.FormDivider>

                    <div className={cl("emotes")}>
                        {emotes.map(emote => (
                            <Tooltip text={emote.name}>
                                {({ onMouseEnter, onMouseLeave }) => (
                                    <Button className={cl("emotebutton")}
                                        look="BLANK"
                                        size="ICON"
                                        aria-haspopup="dialog"
                                        onMouseEnter={onMouseEnter}
                                        onMouseLeave={onMouseLeave}
                                        datatype="emoji"
                                        onClick={() => {
                                            insertTextIntoChatInputBox(GetEmoteURL(emote));
                                            closePopout();
                                        }}
                                    ><img src={GetEmoteURL(emote)} height="40px"></img></Button>
                                )}
                            </Tooltip>
                        ))}
                    </div>


                    <div className={cl("navigation-footer")}>
                        <div className={cl("navigation-footer-arrows")}>
                            <Button className={cl("pagebutton")}
                                look={Button.Looks.BLANK}
                                onClick={() => {
                                    if (!searching) {
                                        page--;
                                        FetchEmotes(value, handleRefresh);
                                    }
                                }}
                            >
                                <svg fill="#000000" height="24px" width="24px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 490 490">
                                    <g>
                                        <polygon fill="#b5bac1" points="242.227,481.919 314.593,407.95 194.882,290.855 490,290.855 490,183.86 210.504,183.86 314.593,82.051 242.227,8.081 0,244.996" />
                                    </g>
                                </svg></Button>
                            <Button className={cl("pagebutton")}
                                look={Button.Looks.BLANK}
                                onClick={() => {
                                    if (!searching) {
                                        page++;
                                        FetchEmotes(value, handleRefresh);
                                    }
                                }}
                            >
                                <svg fill="#000000" height="24px" width="24px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 490 490">
                                    <g>
                                        <g>
                                            <polygon fill="#b5bac1" points="247.773,8.081 175.407,82.05 295.118,199.145 0,199.145 0,306.14 279.496,306.14 175.407,407.949 247.773,481.919 490,245.004" />
                                        </g>
                                    </g>
                                </svg></Button>
                        </div>
                        <div className={cl("footer")}>
                            <Forms.FormText className={cl("pagetext")}>{lastError === "" ? (<>Page {page}</>) : (<>{lastError}</>)}</Forms.FormText>
                        </div>
                    </div>
                </div>
            </div >
        );
    },

    chatBarIcon({
        onClick,
        active
    }) {
        return (
            <Tooltip text="7TV Emotes">
                {({ onMouseEnter, onMouseLeave }) => (
                    <div style={{ display: "flex" }}>
                        <Button
                            aria-haspopup="dialog"
                            aria-label=""
                            size=""
                            look={ButtonLooks.BLANK}
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                            innerClassName={ButtonWrapperClasses.button}
                            onClick={onClick}
                            className={cl("button")}
                        >
                            <div className={ButtonWrapperClasses.buttonWrapper}>
                                <svg
                                    aria-hidden="true"
                                    role="img"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 109.6 80.9"
                                    className={cl("chat-icon") + (active ? " active" : "")}
                                >
                                    <g>
                                        <path d="M84.1,22.2l5-8.7,2.7-4.6L86.8.2V0H60.1l5,8.7,5,8.7,2.8,4.8H84.1"></path>
                                        <path d="M29,80.6l5-8.7,5-8.7,5-8.7,5-8.7,5-8.7,5-8.7L62.7,22l-5-8.7-5-8.7L49.9.1H7.7l-5,8.7L0,13.4l5,8.7v.2h32l-5,8.7-5,8.7-5,8.7-5,8.7-5,8.7L8.5,72l5,8.7v.2H29"></path>
                                        <path d="M70.8,80.6H86.1l5-8.7,5-8.7,5-8.7,5-8.7,3.5-6-5-8.7v-.2H89.2l-5,8.7-5,8.7-.7,1.3-5-8.7-5-8.7-.7-1.3-5,8.7-5,8.7L55,53.1l5,8.7,5,8.7,5,8.7.8,1.4"></path>
                                    </g>
                                </svg>
                            </div>
                        </Button>
                    </div>
                )
                }
            </Tooltip >
        );
    },

    start() {
        if (settings.store.show_badges)
            SevenTVBadges.forEach(badge => Vencord.Api.Badges.addBadge(badge));
    },
});
