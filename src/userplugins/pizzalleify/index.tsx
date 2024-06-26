import definePlugin from "@utils/types";
import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, FluxDispatcher, i18n, Menu, MessageStore, Parser, Timestamp, UserStore, useStateFromStores } from "@webpack/common";

function pizzalleify(str: string): string {
    let result = str[0].toUpperCase() + str.substr(1).toLowerCase();

    if (!result.endsWith(".")) {
        result += ".";
    }

    return result;
}

export default definePlugin({
    name: "Pizzalleify",
    description: "Makes all of your messages Pizzalle-like",
    authors: [Devs.deimos],

    patches: [],

    start() {
        console.log("mreowww blehhh i kill people");
        this.preSend = addPreSendListener((channelId, msg) => {
            msg.content = pizzalleify(msg.content);
        });
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});