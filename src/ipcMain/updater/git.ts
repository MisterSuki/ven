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

import IpcEvents from "@utils/IpcEvents";
import { execFile as cpExecFile } from "child_process";
import { ipcMain } from "electron";
import { join } from "path";
import { promisify } from "util";

import { calculateHashes, serializeErrors } from "./common";

const tagRegex = /v\d+?\.\d+?\.\d+?/;
const VENCORD_SRC_DIR = join(__dirname, "..");

const execFile = promisify(cpExecFile);

const isFlatpak = process.platform === "linux" && Boolean(process.env.FLATPAK_ID?.includes("discordapp") || process.env.FLATPAK_ID?.includes("Discord"));

if (process.platform === "darwin") process.env.PATH = `/usr/local/bin:${process.env.PATH}`;

function git(...args: string[]) {
    const opts = { cwd: VENCORD_SRC_DIR };

    console.log(args);

    if (isFlatpak) return execFile("flatpak-spawn", ["--host", "git", ...args], opts);
    else return execFile("git", args, opts);
}

async function getTags() {
    return (await git("tag", "--sort=committerdate")).stdout
        .trim()
        .split("\n")
        .filter(tag => tag !== "devbuild")
        .reverse();
}

async function getBranchFromPossiblyFakeBranchName(branch: string) {
    const tags = await getTags();

    if (branch === "latest-release") return tags[0] ?? "main";
    return branch;
}

async function getRepo() {
    const res = await git("remote", "get-url", "origin");
    return res.stdout.trim()
        .replace(/git@(.+):/, "https://$1/")
        .replace(/\.git$/, "");
}

async function calculateGitChanges(branch: string) {
    await git("fetch");

    const parsedBranch = await getBranchFromPossiblyFakeBranchName(branch);
    const existsOnOrigin = (await git("ls-remote", "origin", parsedBranch)).stdout.length > 0;
    const res = await git("log", `${parsedBranch}...origin/${existsOnOrigin ? parsedBranch : "HEAD"}`, "--pretty=format:%an/%h/%s");

    const commits = res.stdout.trim();
    return commits ? commits.split("\n").map(line => {
        const [author, hash, ...rest] = line.split("/");
        return {
            hash, author, message: rest.join("/")
        };
    }) : [];
}

async function pull(branch: string) {
    if (branch === "latest-release") return switchBranch(branch, branch, false);

    const existsOnOrigin = (await git("ls-remote", "origin", branch)).stdout.length > 0;
    const res = await git("pull", "origin", existsOnOrigin ? branch : "HEAD");
    return res.stdout.includes("Fast-forward");
}

async function build() {
    const opts = { cwd: VENCORD_SRC_DIR };

    const command = isFlatpak ? "flatpak-spawn" : "node";
    const args = isFlatpak ? ["--host", "node", "scripts/build/build.mjs"] : ["scripts/build/build.mjs"];

    const res = await execFile(command, args, opts);

    return !res.stderr.includes("Build failed");
}

async function getBranches() {
    await git("fetch");

    const branches = (await git("branch", "--list")).stdout
        .replace("*", "")
        .split("\n")
        .map(str => str.trim())
        .filter(branch => branch !== "main" && branch.length > 0 && !branch.startsWith("HEAD detached at "));
    branches.unshift("main", "latest-release");

    const tags = await getTags();
    branches.push(...tags);

    return branches;
}

async function getCurrentBranch() {
    return (await git("branch", "--show-current")).stdout.trim();
}

async function switchBranch(currentBranch: string, newBranch: string, shouldBuild = true) {
    const isCurrentBranchTag = currentBranch.match(tagRegex) !== null;
    console.log(isCurrentBranchTag);

    const parsedBranch = await getBranchFromPossiblyFakeBranchName(newBranch);
    console.log(parsedBranch);
    const isNewBranchTag = parsedBranch.match(tagRegex) !== null;
    console.log(isNewBranchTag);

    await git("switch", parsedBranch + (isNewBranchTag ? " --detach" : ""));

    if (shouldBuild) {
        const buildRes = await build();
        if (!buildRes) {
            await git("switch", currentBranch + (isCurrentBranchTag ? " --detach" : ""));
            await build();
            return false;
        }
    }

    return true;
}

ipcMain.handle(IpcEvents.GET_HASHES, serializeErrors(calculateHashes));
ipcMain.handle(IpcEvents.GET_REPO, serializeErrors(getRepo));
ipcMain.handle(IpcEvents.GET_UPDATES, serializeErrors((_, branch: string) => calculateGitChanges(branch)));
ipcMain.handle(IpcEvents.GET_BRANCHES, serializeErrors(getBranches));
ipcMain.handle(IpcEvents.GET_CURRENT_GIT_BRANCH, serializeErrors(getCurrentBranch));
ipcMain.handle(IpcEvents.SWITCH_BRANCH, serializeErrors((_, currentBranch: string, newBranch: string) => switchBranch(currentBranch, newBranch)));
ipcMain.handle(IpcEvents.UPDATE, serializeErrors((_, branch: string) => pull(branch)));
ipcMain.handle(IpcEvents.BUILD, serializeErrors(build));
