import {
  LeafTreeViewItem,
  RootTreeViewItem,
  TreeViewItem,
} from "@seanchas116/paintkit/src/components/treeview/TreeViewItem";
import {
  TreeRow,
  TreeRowIcon,
  TreeRowLabel,
} from "@seanchas116/paintkit/src/components/treeview/TreeRow";
import { TreeView } from "@seanchas116/paintkit/src/components/treeview/TreeView";
import chevronsIcon from "@seanchas116/paintkit/src/icon/Chevrons";
import widgetsFilledIcon from "@iconify-icons/ic/baseline-widgets";
import generate from "@babel/generator";
import { ReactNode, useMemo } from "react";
import { compact } from "lodash-es";
import { computed, makeObservable } from "mobx";
import { SourceFile } from "../models/SourceFile";
import { JSXElementNode } from "../models/node/JSXElementNode";
import { ComponentNode } from "../models/node/ComponentNode";
import { JSXTextNode } from "../models/node/JSXTextNode";
import { JSXOtherNode } from "../models/node/JSXOtherNode";
import { JSXNode } from "../models/node/JSXNode";

const NODE_DRAG_MIME = "application/x.macaron-tree-drag-node";

class SourceFileTreeViewItem extends RootTreeViewItem {
  constructor(file: SourceFile) {
    super();
    this.file = file;
  }

  readonly file: SourceFile;

  get children(): readonly TreeViewItem[] {
    return this.file.node.children.map(
      (component) => new ComponentTreeViewItem(this.file, this, component)
    );
  }
  deselect(): void {
    this.file.node.deselect();
  }
}

class ComponentTreeViewItem extends TreeViewItem {
  constructor(
    file: SourceFile,
    parent: TreeViewItem | undefined,
    node: ComponentNode
  ) {
    super();
    this.file = file;
    this._parent = parent;
    this.node = node;
  }

  readonly file: SourceFile;
  private readonly _parent: TreeViewItem | undefined;
  readonly node: ComponentNode;

  get key(): string {
    return this.node.key;
  }
  get parent(): TreeViewItem | undefined {
    return this._parent;
  }
  get children(): readonly TreeViewItem[] {
    return [new JSXElementTreeViewItem(this.file, this, this.node.rootElement)];
  }
  get selected(): boolean {
    return this.node.selected;
  }
  get hovered(): boolean {
    // TODO
    return false;
  }
  get collapsed(): boolean {
    return this.node.collapsed;
  }
  get showsCollapseButton(): boolean {
    return true;
  }
  renderRow(options: { inverted: boolean }): ReactNode {
    return (
      <TreeRow inverted={options.inverted}>
        <TreeRowIcon icon={widgetsFilledIcon} />
        <TreeRowLabel>{this.node.componentName ?? "default"}</TreeRowLabel>
      </TreeRow>
    );
  }
  deselect(): void {
    this.node.deselect();
  }
  select(): void {
    this.node.select();
  }
  toggleCollapsed(): void {
    this.node.collapsed = !this.node.collapsed;
  }
}

class JSXElementTreeViewItem extends TreeViewItem {
  constructor(
    file: SourceFile,
    parent: TreeViewItem | undefined,
    node: JSXElementNode
  ) {
    super();
    this.file = file;
    this._parent = parent;
    this.node = node;
    makeObservable(this);
  }

  readonly file: SourceFile;
  private readonly _parent: TreeViewItem | undefined;
  readonly node: JSXElementNode;

  get key(): string {
    return this.node.key;
  }
  get parent(): TreeViewItem | undefined {
    return this._parent;
  }
  get children(): readonly TreeViewItem[] {
    return compact(
      this.node.children.map((child) => {
        if (child instanceof JSXElementNode) {
          return new JSXElementTreeViewItem(this.file, this, child);
        }
        if (child instanceof JSXTextNode) {
          // ignore newlines
          if (/^\s*$/.test(child.value) && child.value.includes("\n")) {
            return;
          }
          return new JSXTextTreeViewItem(this.file, this, child);
        }
        return new JSXOtherTreeViewItem(this.file, this, child);
      })
    );
  }
  @computed get selected(): boolean {
    return this.node.selected;
  }
  @computed get hovered(): boolean {
    return this.file.hoveredElement === this.node;
  }
  get collapsed(): boolean {
    return this.node.collapsed;
  }
  get showsCollapseButton(): boolean {
    return true;
  }
  renderRow(options: { inverted: boolean }): ReactNode {
    return (
      <TreeRow inverted={options.inverted}>
        <TreeRowIcon icon={chevronsIcon} />
        <TreeRowLabel>{this.node.tagName}</TreeRowLabel>
      </TreeRow>
    );
  }
  deselect(): void {
    this.node.deselect();
  }
  select(): void {
    this.node.select();
  }
  toggleCollapsed(): void {
    this.node.collapsed = !this.node.collapsed;
  }

  handleDragStart(e: React.DragEvent): void {
    e.dataTransfer.effectAllowed = "copyMove";
    e.dataTransfer.setData(NODE_DRAG_MIME, "drag");
  }

  canDropData(dataTransfer: DataTransfer): boolean {
    return dataTransfer.types.includes(NODE_DRAG_MIME);
  }

  handleDrop(event: React.DragEvent, before: TreeViewItem | undefined): void {
    const copy = event.altKey || event.ctrlKey;

    const beforeNode =
      before &&
      (
        before as
          | JSXElementTreeViewItem
          | JSXTextTreeViewItem
          | JSXOtherTreeViewItem
      ).node;

    // TODO: copy
    for (const node of this.file.selectedNodes) {
      this.node.insertBefore(node, beforeNode);
    }

    this.file.updateCode();

    // TODO: commit
    // this.context.editorState.history.commit(
    //   copy ? "Duplicate Layers" : "Move Layers"
    // );
  }
}

class JSXTextTreeViewItem extends LeafTreeViewItem {
  constructor(
    file: SourceFile,
    parent: TreeViewItem | undefined,
    node: JSXTextNode
  ) {
    super();
    this.file = file;
    this._parent = parent;
    this.node = node;
  }

  readonly file: SourceFile;
  private readonly _parent: TreeViewItem | undefined;
  readonly node: JSXTextNode;

  get key(): string {
    return this.node.key;
  }
  get parent(): TreeViewItem | undefined {
    return this._parent;
  }
  get selected(): boolean {
    return this.node.selected;
  }
  get hovered(): boolean {
    return false;
  }
  renderRow(options: { inverted: boolean }): ReactNode {
    return (
      <TreeRow inverted={options.inverted}>
        <TreeRowLabel>{this.node.value}</TreeRowLabel>
      </TreeRow>
    );
  }
  deselect(): void {
    this.node.deselect();
  }
  select(): void {
    this.node.select();
  }

  handleDragStart(e: React.DragEvent): void {
    e.dataTransfer.effectAllowed = "copyMove";
    e.dataTransfer.setData(NODE_DRAG_MIME, "drag");
  }
}

class JSXOtherTreeViewItem extends LeafTreeViewItem {
  constructor(
    file: SourceFile,
    parent: TreeViewItem | undefined,
    node: JSXOtherNode
  ) {
    super();
    this.file = file;
    this._parent = parent;
    this.node = node;
  }

  readonly file: SourceFile;
  private readonly _parent: TreeViewItem | undefined;
  readonly node: JSXOtherNode;

  get key(): string {
    return this.node.key;
  }
  get parent(): TreeViewItem | undefined {
    return this._parent;
  }
  get selected(): boolean {
    return this.node.selected;
  }
  get hovered(): boolean {
    return false;
  }
  renderRow(options: { inverted: boolean }): ReactNode {
    return (
      <TreeRow inverted={options.inverted}>
        <TreeRowLabel>{generate(this.node.ast).code}</TreeRowLabel>
      </TreeRow>
    );
  }
  deselect(): void {
    this.node.deselect();
  }
  select(): void {
    this.node.select();
  }

  handleDragStart(e: React.DragEvent): void {
    e.dataTransfer.effectAllowed = "copyMove";
    e.dataTransfer.setData(NODE_DRAG_MIME, "drag");
  }
}

export const JSXTreeView: React.FC<{
  file: SourceFile;
  className?: string;
}> = ({ file, className }) => {
  const rootItem = useMemo(() => new SourceFileTreeViewItem(file), [file]);

  return <TreeView className={className} rootItem={rootItem} />;
};
