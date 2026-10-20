import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { TableView } from "@tiptap/extension-table";
import {
  TABLE_CLASS,
  TABLE_WRAPPER_CLASS,
  resolveTableDesign,
  tableStyleVars,
} from "@/lib/blog/blocks";

/**
 * Tiptap's resizable table view, painted with the table's design attributes
 * so the editor shows exactly what the published article will.
 */
export class StyledTableView extends TableView {
  constructor(node: ProseMirrorNode, cellMinWidth: number) {
    super(node, cellMinWidth);
    this.paint(node);
  }

  update(node: ProseMirrorNode) {
    const updated = super.update(node);
    if (updated) this.paint(node);
    return updated;
  }

  private paint(node: ProseMirrorNode) {
    this.dom.className = `tableWrapper ${TABLE_WRAPPER_CLASS}`;
    this.dom.setAttribute("style", tableStyleVars(resolveTableDesign(node.attrs)));
    this.table.className = TABLE_CLASS;
  }
}
