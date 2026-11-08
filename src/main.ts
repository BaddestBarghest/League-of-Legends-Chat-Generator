import "./fonts";
import "./style.css";
import { refreshChampions } from "./champions";
import { mountEditor } from "./editor";
import { mountExporters } from "./exporters";
import { mountPingBuilder } from "./pingBuilder";
import { mountPreview } from "./preview";
import { mountProjectFiles, restoreAutosave } from "./project";
import { mountStyleControls } from "./styleControls";

restoreAutosave();
void refreshChampions();
mountEditor();
mountPingBuilder();
mountStyleControls();
mountPreview();
mountExporters();
mountProjectFiles();
