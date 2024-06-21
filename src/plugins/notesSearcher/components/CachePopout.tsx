/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { LazyComponent } from "@utils/lazyReact";
import { Button, Popout, React, Text, useState } from "@webpack/common";

import { cacheUsers, getRunning, NotesMap, setupStates, stopCacheProcess, usersCache } from "../data";
import { CrossIcon, ProblemIcon, SuccessIcon } from "./Icons";
import { LoadingSpinner } from "./LoadingSpinner";

const cl = classNameFactory("vc-notes-searcher-modal-");

export default LazyComponent(() => React.memo(() => {
    const [shouldShow, setShouldShow] = useState(false);

    return (
        <Popout
            animation={Popout.Animation.SCALE}
            align="center"
            position="bottom"
            shouldShow={shouldShow}
            onRequestClose={() => setShouldShow(false)}
            renderPopout={() => {
                const [isRunning, setRunning] = useState(getRunning);
                const [cacheStatus, setCacheStatus] = useState(usersCache.size);

                setupStates({
                    setRunning,
                    setCacheStatus,
                });

                return <div className={cl("cache-container")}>
                    <Text className={cl("cache-header")} variant="heading-lg/semibold">
                        Fetch the profile of all users to filter notes by global name or username
                    </Text>
                    <div>
                        <div className={cl("cache-buttons")}>
                            <Button
                                className={cl("cache-cache")}
                                size={Button.Sizes.NONE}
                                color={Button.Colors.GREEN}
                                disabled={isRunning}
                                onClick={() => cacheUsers()}
                            >
                                {
                                    cacheStatus === 0 ? "Cache Users" : "Re-Cache Users"
                                }
                            </Button>
                            <Button
                                className={cl("cache-cache-missing")}
                                size={Button.Sizes.NONE}
                                color={Button.Colors.YELLOW}
                                disabled={isRunning || cacheStatus === 0 || cacheStatus === NotesMap.size}
                                onClick={() => cacheUsers(true)}
                            >
                                Cache Missing Users
                            </Button>
                            <Button
                                className={cl("cache-stop")}
                                size={Button.Sizes.NONE}
                                color={Button.Colors.RED}
                                disabled={!isRunning}
                                onClick={() => {
                                    stopCacheProcess();
                                }}
                            >
                                Stop
                            </Button>
                        </div>
                        <div className={cl("cache-status")}>
                            {
                                isRunning ? <LoadingSpinner />
                                    : cacheStatus === NotesMap.size ? <SuccessIcon />
                                        : cacheStatus === 0 ? <CrossIcon />
                                            : <ProblemIcon />
                            }
                            {
                                cacheStatus === NotesMap.size ? "All users cached 👍"
                                    : cacheStatus === 0 ? "Users aren't cached 😔"
                                        : `${cacheStatus}/${NotesMap.size}`
                            }
                        </div>
                    </div>
                    <Text className={cl("cache-warning")} variant="text-md/normal">
                        Please note that during this process Discord may not properly load some content, such as messages, images or user profiles
                    </Text>
                    <Text className={cl("cache-footer")} variant="text-md/normal">
                        You can turn on caching of all users on startup in plugin settings
                    </Text>
                </div>;
            }}
        >
            {
                (_, { isShown }) =>
                    <Button
                        className={cl("header-cache")}
                        size={Button.Sizes.NONE}
                        color={Button.Colors.PRIMARY}
                        onClick={() => setShouldShow(!isShown)}
                    >
                        Cache
                    </Button>
            }
        </Popout>
    );
}));
