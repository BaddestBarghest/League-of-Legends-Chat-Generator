import "./style.css";
import { mountEditor } from "./editor";
import { mountExporters } from "./exporters";
import { mountPreview } from "./preview";
import { mountStyleControls } from "./styleControls";

mountEditor();
mountStyleControls();
mountPreview();
mountExporters();
