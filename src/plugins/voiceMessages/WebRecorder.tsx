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

import { Button, useState } from "@webpack/common";

import type { VoiceRecorder } from ".";

export const VoiceRecorderWeb: VoiceRecorder = ({ setAudioBlob }) => {
    const [recording, setRecording] = useState(false);
    const [paused, setPaused] = useState(false);
    const [recorder, setRecorder] = useState<MediaRecorder>();
    const [chunks, setChunks] = useState<Blob[]>([]);

    function toggleRecording() {
        const nowRecording = !recording;

        if (nowRecording) {
            navigator.mediaDevices.getUserMedia({
                audio: {
                    noiseSuppression: true,
                    echoCancellation: true,
                }
            }).then(stream => {
                const chunks = [] as Blob[];
                setChunks(chunks);

                const recorder = new MediaRecorder(stream);
                setRecorder(recorder);
                recorder.addEventListener("dataavailable", e => {
                    chunks.push(e.data);
                });
                recorder.start();

                setRecording(true);
            });
        } else {
            if (recorder) {
                recorder.addEventListener("stop", () => {
                    setAudioBlob(new Blob(chunks, { type: "audio/ogg; codecs=opus" }));

                    setRecording(false);
                });
                recorder.stop();
            }
        }
    }

    return (
        <>
            <Button onClick={toggleRecording}>
                {recording ? "Stop" : "Start"} recording
            </Button>

            <Button
                disabled={!recording}
                onClick={() => {
                    setPaused(!paused);
                    if (paused) recorder?.resume();
                    else recorder?.pause();
                }}
            >
                {paused ? "Resume" : "Pause"} recording
            </Button>
        </>
    );
};
