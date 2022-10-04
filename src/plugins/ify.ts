import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

export default definePlugin({
    name: "Ify",
    description: "Disabes Spotify auto-pausing and premium checks",
    authors: [Devs.Cyn],
    patches: {
        find: '.displayName="SpotifyStore"',
        replacement: [{
            match: /\.isPremium=.;/,
            replace: ".isPremium=true;",
        }, {
            match: /function (.{1,2})\(\).{0,200}SPOTIFY_AUTO_PAUSED\);.{0,}}}}/,
            replace: "function $1(){}"
        }]
    }
});
