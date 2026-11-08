import "./style.css";
import { mountEditor } from "./editor";
import { mountExporters } from "./exporters";
import { mountPreview } from "./preview";
import { mountProjectFiles, restoreAutosave } from "./project";
import { mountStyleControls } from "./styleControls";

restoreAutosave();
mountEditor();
mountStyleControls();
mountPreview();
mountExporters();
mountProjectFiles();
