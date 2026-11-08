import "./fonts";
import "./style.css";
import { refreshChampions } from "./champions";
import { loadGameData } from "./gameData";
import { restoreFonts } from "./fontStore";
import { changed } from "./state";
import { mountEditor } from "./editor";
import { mountExporters } from "./exporters";
import { mountFontsGuide } from "./fontsGuide";
import { mountComposer } from "./composer";
import { mountPreview } from "./preview";
import { mountRoster } from "./roster";
import { mountProjectFiles, restoreAutosave } from "./project";
import { mountStyleControls } from "./styleControls";

restoreAutosave();
// Fonts saved from earlier visits, then redraw with them.
void restoreFonts().then(() => changed(true));
void refreshChampions();
// Redraw once names and icons arrive from Riot.
void loadGameData().then(() => changed(true));
mountRoster("#roster", false);
mountRoster("#sb-roster", true);
mountEditor();
mountComposer();
mountStyleControls();
mountPreview();
mountExporters();
mountProjectFiles();
mountFontsGuide();
