import {
  useEffect,
  useReducer,
  useRef,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import { PREVIEW_CORNERS, type Point2D, type Quad } from "../math/homography";
import { clampToMap, moveCorner, validateQuad } from "../math/geometry";
import { PERSPECTIVE_EXAMPLE } from "../math/education";

type State = {
  corners: Quad;
  selected: number | null;
  active: number | null;
  warning: string | null;
};
type Action =
  | { type: "select"; index: number; dragging: boolean }
  | { type: "move"; index: number; point: Point2D }
  | { type: "nudge"; index: number; dx: number; dy: number }
  | { type: "stop" }
  | { type: "example" }
  | { type: "reset" };
const initial: State = {
  corners: PREVIEW_CORNERS,
  selected: null,
  active: null,
  warning: null,
};
function reducer(state: State, action: Action): State {
  if (action.type === "example")
    return validateQuad(PERSPECTIVE_EXAMPLE)
      ? state
      : { ...initial, corners: PERSPECTIVE_EXAMPLE };
  if (action.type === "reset") return initial;
  if (action.type === "stop") return { ...state, active: null, warning: null };
  if (action.type === "select")
    return {
      ...state,
      selected: action.index,
      active: action.dragging ? action.index : null,
      warning: null,
    };
  const previous = state.corners[action.index];
  const point = clampToMap(
    action.type === "move"
      ? action.point
      : { x: previous.x + action.dx, y: previous.y + action.dy },
  );
  const candidate = moveCorner(state.corners, action.index, point);
  const warning = validateQuad(candidate);
  return {
    ...state,
    selected: action.index,
    corners: warning ? state.corners : candidate,
    warning,
  };
}
function svgPosition(svg: SVGSVGElement, x: number, y: number): Point2D | null {
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  try {
    const point = new DOMPoint(x, y).matrixTransform(matrix.inverse());
    return Number.isFinite(point.x) && Number.isFinite(point.y)
      ? { x: point.x, y: point.y }
      : null;
  } catch {
    return null;
  }
}
export function useCornerInteraction() {
  const [state, dispatch] = useReducer(reducer, initial);
  // Only pointer metadata lives in this ref; reducer state is the sole corner source.
  const drag = useRef<{
    id: number;
    index: number;
    offset: Point2D;
    svg: SVGSVGElement;
  } | null>(null);
  const frame = useRef(0);
  const pending = useRef<Action | null>(null);
  function flush() {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    if (pending.current) dispatch(pending.current);
    pending.current = null;
  }
  useEffect(() => () => {
    cancelAnimationFrame(frame.current);
    pending.current = null;
    const current = drag.current;
    drag.current = null;
    if (current?.svg.hasPointerCapture(current.id)) current.svg.releasePointerCapture(current.id);
  }, []);
  function stop() {
    flush();
    const current = drag.current;
    drag.current = null;
    if (current?.svg.hasPointerCapture(current.id))
      current.svg.releasePointerCapture(current.id);
    dispatch({ type: "stop" });
  }
  function onPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (drag.current || !event.isPrimary || event.button !== 0) return;
    const handle = (event.target as Element).closest<SVGGElement>(
      "[data-corner]",
    );
    if (!handle) return;
    const index = Number(handle.dataset.corner);
    const point = svgPosition(
      event.currentTarget,
      event.clientX,
      event.clientY,
    );
    if (!point) return;
    event.preventDefault();
    handle.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      id: event.pointerId,
      index,
      svg: event.currentTarget,
      offset: {
        x: state.corners[index].x - point.x,
        y: state.corners[index].y - point.y,
      },
    };
    dispatch({ type: "select", index, dragging: true });
  }
  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    event.preventDefault();
    const point = svgPosition(
      event.currentTarget,
      event.clientX,
      event.clientY,
    );
    if (point) {
      pending.current = {
        type: "move",
        index: current.index,
        point: { x: point.x + current.offset.x, y: point.y + current.offset.y },
      };
      if (!frame.current) frame.current = requestAnimationFrame(flush);
    }
  }
  function finish(event: PointerEvent<SVGSVGElement>) {
    if (drag.current?.id === event.pointerId) stop();
  }
  function onKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key === "Escape") {
      stop();
      return;
    }
    if (drag.current) return;
    const handle = (event.target as Element).closest<SVGGElement>(
      "[data-corner]",
    );
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const direction = directions[event.key];
    if (!handle || !direction) return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 2;
    dispatch({
      type: "nudge",
      index: Number(handle.dataset.corner),
      dx: direction[0] * step,
      dy: direction[1] * step,
    });
  }
  return {
    ...state,
    stop,
    example: () => {
      stop();
      dispatch({ type: "example" });
    },
    reset: () => {
      stop();
      dispatch({ type: "reset" });
    },
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
      onLostPointerCapture: finish,
      onKeyDown,
    },
  };
}
export type CornerInteraction = ReturnType<typeof useCornerInteraction>;
