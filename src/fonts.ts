import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import { HAND_FAMILY, SERIF_FAMILY } from "./layout";

// Bundled with the project so local and CI (Ubuntu) renders look identical.
// Both fonts use the SIL Open Font License (public/fonts/OFL-*.txt).
export const fontsLoaded = Promise.all([
  loadFont({
    family: SERIF_FAMILY,
    url: staticFile("fonts/Tinos-Regular.ttf"),
    weight: "400",
  }),
  loadFont({
    family: SERIF_FAMILY,
    url: staticFile("fonts/Tinos-Bold.ttf"),
    weight: "700",
  }),
  loadFont({
    family: HAND_FAMILY,
    url: staticFile("fonts/Kalam-Bold.ttf"),
    weight: "700",
  }),
]);
