import "./style.css";
import { mountEditor } from "./editor";
import { mountExporters } from "./exporters";
import { mountPreview } from "./preview";

mountEditor();
mountPreview();
mountExporters();
