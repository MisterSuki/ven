module.exports = {
    name: "MessageHookAPI",
    patches: [
        {
            find: "sendMessage:function",
            replacement: {
                match: /(?<=sendMessage:function\(.{1,2},.{1,2},.{1,2},.{1,2}\)){/,
                replace: "{Vencord.Api.MessageSendAndEditAPI._handleSend(...arguments);"
            }
        },
        {
            find: "editMessage:function",
            replacement: {
                match: /(?<=editMessage:function\(.{1,2},.{1,2},.{1,2}\)){/,
                replace: "{Vencord.Api.MessageSendAndEditAPI._handleEdit(...arguments);"
            }
        },
        {
            find: "if(e.altKey){",
            replacement: {
                match: /\.useClickMessage=function\((.{1,2}),(.{1,2})\).+?function\((.{1,2})\){/,
                replace: (m, message, channel, event) =>
                    // the message param is shadowed by the event param, so need to alias them
                    `${m.replace("{", `{var _msg=${message};var _chan=${channel};`)}Vencord.Api.MessageClicks._handleClick(_msg, _chan, ${event});`
            }
        }
    ]
};
