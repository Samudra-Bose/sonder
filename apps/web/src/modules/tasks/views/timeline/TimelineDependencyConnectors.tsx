import React, { useRef, useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils.js";
import type { TaskDto } from "@/modules/tasks/types.js";
import type {
  TaskQueryDependencyEdgeDto,
  TaskQueryVisibleEndpointDto,
} from "@/modules/tasks/dependencies/types.js";
import {
  detectBlockerConflict,
  type DependencyConflictResult,
} from "@/modules/tasks/dependencies/dependency-conflict-utils.js";
import type { TaskTimelinePosition } from "./timeline-date-utils.js";

export interface TimelineDependencyConnectorsProps {
  tasks: TaskDto[];
  taskPositions: Map<string, TaskTimelinePosition>;
  dependencyEdges: TaskQueryDependencyEdgeDto[];
  rowHeight?: number;
  className?: string;
}

interface VisibleConnector {
  id: string;
  linkId: string;
  type: string;
  sourceTask: TaskDto;
  targetTask: TaskDto;
  blockerTask: TaskDto;
  dependentTask: TaskDto;
  conflict: DependencyConflictResult;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  pathData: string;
  midX: number;
  midY: number;
}

export function TimelineDependencyConnectors({
  tasks,
  taskPositions,
  dependencyEdges,
  rowHeight = 44,
  className,
}: TimelineDependencyConnectorsProps): React.JSX.Element | null {
  const containerRef = useRef<SVGSVGElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(1000);
  const [hoveredConnectorId, setHoveredConnectorId] = useState<string | null>(null);

  // Measure container width responsively
  useEffect(() => {
    const updateWidth = () => {
      const el = containerRef.current?.parentElement ?? containerRef.current;
      if (el) {
        const width = el.clientWidth || el.getBoundingClientRect().width;
        if (width > 0) {
          setContainerWidth(width);
        }
      }
    };

    updateWidth();

    const el = containerRef.current?.parentElement ?? containerRef.current;
    if (typeof ResizeObserver !== "undefined" && el) {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          if (width > 0) {
            setContainerWidth(width);
          }
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    }

    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Map tasks by ID and find their row indices
  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const rowIndexById = useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach((t, index) => map.set(t.id, index));
    return map;
  }, [tasks]);

  // Compute point-to-point connectors for edges where both tasks are visible
  const visibleConnectors = useMemo<VisibleConnector[]>(() => {
    if (dependencyEdges.length === 0 || tasks.length === 0) return [];

    const connectors: VisibleConnector[] = [];
    const seenLinks = new Set<string>();

    for (const edge of dependencyEdges) {
      if (seenLinks.has(edge.linkId)) continue;
      seenLinks.add(edge.linkId);

      // Check if opposite endpoint is accessible
      if (edge.otherEndpoint.access === "RESTRICTED") {
        continue;
      }

      const otherEndpoint = edge.otherEndpoint as TaskQueryVisibleEndpointDto;
      let sourceId: string;
      let targetId: string;

      if (edge.direction === "OUTGOING") {
        sourceId = edge.visibleTaskId;
        targetId = otherEndpoint.taskId;
      } else {
        sourceId = otherEndpoint.taskId;
        targetId = edge.visibleTaskId;
      }

      const sourceTask = tasksById.get(sourceId);
      const targetTask = tasksById.get(targetId);
      const sourceRowIndex = rowIndexById.get(sourceId);
      const targetRowIndex = rowIndexById.get(targetId);
      const sourcePos = taskPositions.get(sourceId);
      const targetPos = taskPositions.get(targetId);

      // Both tasks must be in visible rows and have valid positions
      if (
        !sourceTask ||
        !targetTask ||
        sourceRowIndex === undefined ||
        targetRowIndex === undefined ||
        !sourcePos ||
        !targetPos ||
        !sourcePos.isVisible ||
        !targetPos.isVisible
      ) {
        continue;
      }

      // Determine blocker vs dependent
      let blockerTask: TaskDto;
      let dependentTask: TaskDto;
      let blockerRowIndex: number;
      let dependentRowIndex: number;
      let blockerPos: TaskTimelinePosition;
      let dependentPos: TaskTimelinePosition;

      if (edge.type === "IS_BLOCKED_BY") {
        // target blocks source
        blockerTask = targetTask;
        dependentTask = sourceTask;
        blockerRowIndex = targetRowIndex;
        dependentRowIndex = sourceRowIndex;
        blockerPos = targetPos;
        dependentPos = sourcePos;
      } else {
        // source blocks target (or RELATES_TO / DUPLICATES)
        blockerTask = sourceTask;
        dependentTask = targetTask;
        blockerRowIndex = sourceRowIndex;
        dependentRowIndex = targetRowIndex;
        blockerPos = sourcePos;
        dependentPos = targetPos;
      }

      const conflict =
        edge.type === "BLOCKS" || edge.type === "IS_BLOCKED_BY"
          ? detectBlockerConflict(blockerTask, dependentTask)
          : { hasConflict: false };

      // Calculate pixel coordinates
      // Blocker end is right edge of its bar
      const blockerRightPercent = blockerPos.leftPercent + blockerPos.widthPercent;
      const x1 = Math.round((blockerRightPercent / 100) * containerWidth);
      const y1 = Math.round(blockerRowIndex * rowHeight + rowHeight / 2);

      // Dependent start is left edge of its bar
      const dependentLeftPercent = dependentPos.leftPercent;
      const x2 = Math.round((dependentLeftPercent / 100) * containerWidth);
      const y2 = Math.round(dependentRowIndex * rowHeight + rowHeight / 2);

      // Compute bezier path
      let pathData = "";
      let midX = Math.round((x1 + x2) / 2);
      let midY = Math.round((y1 + y2) / 2);

      if (x2 >= x1 + 16) {
        // Normal forward flow: Blocker ends before dependent begins
        const dx = Math.max(20, (x2 - x1) / 2);
        pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
      } else {
        // Conflict or reverse flow: Loop curve around
        const offset = Math.max(30, Math.abs(x1 - x2) / 2 + 20);
        pathData = `M ${x1} ${y1} C ${x1 + offset} ${y1}, ${x2 - offset} ${y2}, ${x2} ${y2}`;
        midX = Math.round((x1 + x2) / 2 + (x1 >= x2 ? 15 : -15));
        midY = Math.round((y1 + y2) / 2);
      }

      connectors.push({
        id: `connector-${edge.linkId}`,
        linkId: edge.linkId,
        type: edge.type,
        sourceTask,
        targetTask,
        blockerTask,
        dependentTask,
        conflict,
        x1,
        y1,
        x2,
        y2,
        pathData,
        midX,
        midY,
      });
    }

    return connectors;
  }, [dependencyEdges, tasks, tasksById, rowIndexById, taskPositions, containerWidth, rowHeight]);

  const totalHeight = Math.max(300, tasks.length * rowHeight);

  if (visibleConnectors.length === 0) {
    return null;
  }

  return (
    <svg
      ref={containerRef}
      data-testid="timeline-dependency-svg"
      className={cn("absolute inset-0 w-full pointer-events-none z-20", className)}
      style={{ height: `${totalHeight}px` }}
      aria-label="Timeline task dependency connectors"
    >
      <defs>
        {/* Standard Blocker Arrow */}
        <marker
          id="arrow-blocks"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--color-slate-400, #94a3b8)" />
        </marker>

        {/* Hovered Arrow */}
        <marker
          id="arrow-blocks-hover"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--color-indigo-600, #6366f1)" />
        </marker>

        {/* Conflict Warning Arrow */}
        <marker
          id="arrow-conflict"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
        </marker>
      </defs>

      {visibleConnectors.map((conn) => {
        const isHovered = hoveredConnectorId === conn.id;
        const hasConflict = conn.conflict.hasConflict;

        let strokeColor = "var(--color-slate-400, #94a3b8)";
        let markerEnd: string | undefined = "url(#arrow-blocks)";
        let strokeDasharray: string | undefined = undefined;
        let strokeWidth = 1.5;

        if (hasConflict) {
          strokeColor = "#f59e0b"; // Warning amber
          markerEnd = "url(#arrow-conflict)";
          strokeWidth = 2;
        } else if (conn.type === "RELATES_TO") {
          strokeColor = "var(--color-slate-400, #94a3b8)";
          strokeDasharray = "4 4";
          markerEnd = undefined;
        } else if (conn.type === "DUPLICATES") {
          strokeColor = "#a855f7"; // Violet
          strokeDasharray = "2 3";
          markerEnd = undefined;
        }

        if (isHovered) {
          strokeColor = hasConflict ? "#d97706" : "var(--color-indigo-600, #6366f1)";
          markerEnd = hasConflict ? "url(#arrow-conflict)" : "url(#arrow-blocks-hover)";
          strokeWidth = 2.5;
        }

        const ariaLabel = hasConflict
          ? conn.conflict.reason
          : `${conn.blockerTask.taskKey} ${conn.type.replace(/_/g, " ").toLowerCase()} ${conn.dependentTask.taskKey}`;

        return (
          <g
            key={conn.id}
            data-testid={`dependency-connector-${conn.linkId}`}
            className="pointer-events-auto cursor-pointer"
            onMouseEnter={() => setHoveredConnectorId(conn.id)}
            onMouseLeave={() => setHoveredConnectorId(null)}
          >
            {/* Wider transparent hit area for hover ease */}
            <path
              d={conn.pathData}
              fill="none"
              stroke="transparent"
              strokeWidth={14}
              aria-hidden="true"
            />

            {/* Visible connector line */}
            <path
              d={conn.pathData}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              markerEnd={markerEnd}
              role="graphics-symbol"
              aria-label={ariaLabel}
              className="transition-colors duration-150"
            />

            {/* Conflict Warning Indicator Pill on connector */}
            {hasConflict && (
              <g
                transform={`translate(${conn.midX - 10}, ${conn.midY - 10})`}
                data-testid={`connector-conflict-badge-${conn.linkId}`}
                aria-label={`Conflict: Blocker completes after dependent starts`}
              >
                <circle
                  cx="10"
                  cy="10"
                  r="9"
                  fill="#fef3c7"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                />
                <text
                  x="10"
                  y="14"
                  textAnchor="middle"
                  fill="#b45309"
                  fontSize="10"
                  fontWeight="bold"
                >
                  !
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
