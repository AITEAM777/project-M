"use client";
import { memo } from "react";
import { BaseEdge, EdgeLabelRenderer, Position, getBezierPath, useInternalNode, type EdgeProps, type InternalNode } from "@xyflow/react";
import { RELATION_META, type MindNode, type RelationEdge } from "./types";

type Rect = { x: number; y: number; w: number; h: number };
function rect(n: InternalNode<MindNode>): Rect {
  return { x: n.internals.positionAbsolute.x, y: n.internals.positionAbsolute.y, w: n.measured?.width ?? 220, h: n.measured?.height ?? 60 };
}

/**
 * "Floating" anchors: edges attach to whichever sides of the two nodes face each other,
 * so connections stay tidy however nodes are dragged around.
 */
function anchors(s: Rect, t: Rect) {
  const scx = s.x + s.w / 2, scy = s.y + s.h / 2, tcx = t.x + t.w / 2, tcy = t.y + t.h / 2;
  const dx = tcx - scx, dy = tcy - scy;
  const horizontalGap = dx > 0 ? t.x - (s.x + s.w) : s.x - (t.x + t.w);
  if (horizontalGap > 24 || (Math.abs(dx) > Math.abs(dy) * 1.6 && horizontalGap > -20)) {
    return dx > 0
      ? { sx: s.x + s.w, sy: scy, sp: Position.Right, tx: t.x, ty: tcy, tp: Position.Left }
      : { sx: s.x, sy: scy, sp: Position.Left, tx: t.x + t.w, ty: tcy, tp: Position.Right };
  }
  return dy > 0
    ? { sx: scx, sy: s.y + s.h, sp: Position.Bottom, tx: tcx, ty: t.y, tp: Position.Top }
    : { sx: scx, sy: s.y, sp: Position.Top, tx: tcx, ty: t.y + t.h, tp: Position.Bottom };
}

export const RelationEdgeView = memo(function RelationEdgeView(props: EdgeProps<RelationEdge>) {
  const { id, source, target, data, selected, markerEnd, markerStart, style } = props;
  const sn = useInternalNode<MindNode>(source);
  const tn = useInternalNode<MindNode>(target);
  if (!sn || !tn) return null;
  const a = anchors(rect(sn), rect(tn));
  const [path, lx, ly] = getBezierPath({ sourceX: a.sx, sourceY: a.sy, sourcePosition: a.sp, targetX: a.tx, targetY: a.ty, targetPosition: a.tp, curvature: 0.3 });
  const meta = RELATION_META[data?.relation ?? "RELATED_TO"];
  // Hierarchy (part of) and generic links stay unlabeled to reduce clutter.
  const text = data?.label || (data?.relation && data.relation !== "RELATED_TO" && data.relation !== "PART_OF" ? meta.label : "");
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        markerStart={markerStart}
        interactionWidth={18}
        style={{ ...style, stroke: selected ? "var(--accent)" : meta.color, strokeWidth: selected ? 2.4 : 1.7, strokeDasharray: meta.dashed ? "6 5" : undefined }}
      />
      {text && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-auto absolute max-w-40 truncate rounded-full border px-2 py-0.5 text-[10.5px] font-medium shadow-sm"
            style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)`, background: "var(--surface)", color: selected ? "var(--accent)" : meta.color, borderColor: selected ? "var(--accent)" : `${meta.color}55` }}
            title={data?.description || meta.label}
          >
            {text}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

export const edgeTypes = { relation: RelationEdgeView };
