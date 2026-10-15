import { tr } from "@/lib/i18n";

/** React Flow's built-in labels (zoom buttons, minimap…) in the UI language. */
export function flowAriaLabels() {
  return {
    "node.a11yDescription.default": tr("Press Enter or Space to select a card. Delete removes it, Escape cancels."),
    "edge.a11yDescription.default": tr("Press Enter or Space to select a connection. Delete removes it, Escape cancels."),
    "controls.ariaLabel": tr("Canvas controls"),
    "controls.zoomIn.ariaLabel": tr("Zoom in"),
    "controls.zoomOut.ariaLabel": tr("Zoom out"),
    "controls.fitView.ariaLabel": tr("Fit to screen"),
    "controls.interactive.ariaLabel": tr("Toggle interactivity"),
    "minimap.ariaLabel": tr("Minimap"),
    "handle.ariaLabel": tr("Connection point"),
  };
}
