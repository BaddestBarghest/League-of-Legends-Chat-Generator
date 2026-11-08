import "./fonts";
import "./style.css";
import { mountEditor } from "./editor";
import { mountExporters } from "./exporters";
import { mountPingBuilder } from "./pingBuilder";
import { mountPreview } from "./preview";
import { mountProjectFiles, restoreAutosave } from "./project";
import { mountStyleControls } from "./styleControls";

restoreAutosave();
mountEditor();
mountPingBuilder();
mountStyleControls();
mountPreview();
mountExporters();
mountProjectFiles();
