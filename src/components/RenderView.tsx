import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';

import { formulaRegistry } from '../fractals/registry';
import { applyNavigationFrame } from '../navigation/motion';
import { getActionsForKey } from '../navigation/keyboard';
import { navigationActionDefinitionMap } from '../navigation/settings';
import { mapPixelToComplex, panViewport, updateAspectRatio, zoomViewport } from '../navigation/viewport';
import { getRenderCoordinator } from '../rendering/RenderCoordinator';
import type { RendererDiagnostics } from '../rendering/diagnostics';
import type { RenderSurface } from '../rendering/types';
import { toNumber } from '../math/doubleSingle';
import type { RenderViewPlaceholder } from '../app/juliaPanel';
import type {
  DoubleSingleComplex,
  NavigationActionId,
  NavigationSettings,
  RenderConfig,
} from '../types/config';

interface RenderViewProps {
  viewId?: string;
  title: string;
  subtitle: string;
  config: RenderConfig;
  onConfigChange: (config: RenderConfig) => void;
  onPointSelect?: (point: DoubleSingleComplex) => void;
  onDiagnosticsChange?: (diagnostics: RendererDiagnostics) => void;
  navigationSettings: NavigationSettings;
  onRequestReset?: () => void;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
  interactionEnabled?: boolean;
  interactionDisabledLabel?: string;
  renderingEnabled?: boolean;
  presentationAspectRatio?: boolean;
  placeholder?: RenderViewPlaceholder | null;
  onNavigationActionEvent?: (event: { action: NavigationActionId; phase: 'start' | 'end' }) => void;
  onDiscreteNavigationAction?: (action: NavigationActionId, precisionMode: boolean) => void;
  onUserNavigate?: () => void;
  highlightForTutorial?: boolean;
  headerAction?: ReactNode;
}

interface PointerDragState {
  pointerId: number;
  x: number;
  y: number;
  distance: number;
}

interface ViewSize {
  width: number;
  height: number;
}

const POINT_SELECTION_DRAG_TOLERANCE = 12;

export function RenderView({
  viewId,
  title,
  subtitle,
  config,
  onConfigChange,
  onPointSelect,
  onDiagnosticsChange,
  navigationSettings,
  onRequestReset,
  onCanvasReady,
  interactionEnabled = true,
  interactionDisabledLabel = 'Preview layer',
  renderingEnabled = true,
  presentationAspectRatio = false,
  placeholder = null,
  onNavigationActionEvent,
  onDiscreteNavigationAction,
  onUserNavigate,
  highlightForTutorial = false,
  headerAction,
}: RenderViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const surfaceRef = useRef<RenderSurface | null>(null);
  const configRef = useRef(config);
  const navigationSettingsRef = useRef(navigationSettings);
  const sizeRef = useRef<ViewSize>({ width: 1, height: 1 });
  const dragRef = useRef<PointerDragState | null>(null);
  const activeActionsRef = useRef<Set<NavigationActionId>>(new Set());
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const navigationCallbacksRef = useRef({
    onRequestReset,
    onNavigationActionEvent,
    onDiscreteNavigationAction,
    onUserNavigate,
  });

  const [backendLabel, setBackendLabel] = useState(renderingEnabled ? 'Preparing renderer' : 'Standby');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<RendererDiagnostics | null>(null);
  const [isInteractive, setIsInteractive] = useState(true);
  const [hasKeyboardFocus, setHasKeyboardFocus] = useState(false);

  configRef.current = presentationAspectRatio && sizeRef.current.width > 1 && sizeRef.current.height > 1
    ? { ...config, viewport: updateAspectRatio(config.viewport, sizeRef.current.width / sizeRef.current.height) } : config;
  navigationSettingsRef.current = navigationSettings;
  navigationCallbacksRef.current = {
    onRequestReset,
    onNavigationActionEvent,
    onDiscreteNavigationAction,
    onUserNavigate,
  };

  useEffect(() => {
    onCanvasReady?.(canvasRef.current);
    return () => onCanvasReady?.(null);
  }, [onCanvasReady]);

  useEffect(() => {
    let disposed = false;

    async function initializeSurface() {
      if (!renderingEnabled || !canvasRef.current) {
        return;
      }

      try {
        const selection = await getRenderCoordinator(canvasRef.current);
        const { coordinator, diagnostics: nextDiagnostics } = selection;
        if (disposed || !canvasRef.current) {
          return;
        }

        setDiagnostics(nextDiagnostics);
        onDiagnosticsChange?.(nextDiagnostics);
        setBackendLabel(coordinator.backendLabel);
        setIsInteractive(coordinator.interactive);
        const surface = await coordinator.createSurface(canvasRef.current);
        if (disposed) {
          surface.destroy();
          return;
        }

        surfaceRef.current = surface;
        resizeSurface();
        await surface.render(configRef.current);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to initialise the renderer.';
        setRenderError(message);
      }
    }

    initializeSurface();

    return () => {
      disposed = true;
      surfaceRef.current?.destroy();
      surfaceRef.current = null;
    };
  }, [onDiagnosticsChange, renderingEnabled]);

  useEffect(() => {
    if (renderingEnabled) {
      setBackendLabel('Preparing renderer');
      return;
    }

    surfaceRef.current?.destroy();
    surfaceRef.current = null;
    setBackendLabel('Standby');
    setRenderError(null);
    setDiagnostics(null);
    setIsInteractive(false);
    setHasKeyboardFocus(false);
    activeActionsRef.current.clear();
  }, [renderingEnabled]);

  useEffect(() => {
    if (!hasKeyboardFocus || !isInteractive || !interactionEnabled) {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastFrameTimeRef.current = null;
      activeActionsRef.current.clear();
      return;
    }

    function tick(timestamp: number) {
      const previousTimestamp = lastFrameTimeRef.current ?? timestamp;
      lastFrameTimeRef.current = timestamp;

      const nextViewport = applyNavigationFrame(
        configRef.current.viewport,
        activeActionsRef.current,
        navigationSettingsRef.current,
        (timestamp - previousTimestamp) / 1000,
      );

      if (nextViewport !== configRef.current.viewport) {
        onConfigChange({
          ...configRef.current,
          viewport: nextViewport,
        });
      }

      animationFrameRef.current = window.requestAnimationFrame(tick);
    }

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastFrameTimeRef.current = null;
    };
  }, [hasKeyboardFocus, isInteractive, interactionEnabled, onConfigChange]);

  useEffect(() => {
    if (!interactionEnabled) {
      dragRef.current = null;
      activeActionsRef.current.clear();
      setHasKeyboardFocus(false);
    }
  }, [interactionEnabled]);

  useEffect(() => {
    if (!hasKeyboardFocus || !isInteractive || !interactionEnabled) {
      return;
    }

    window.addEventListener('keydown', handleNavigationKeyDown, true);
    window.addEventListener('keyup', handleNavigationKeyUp, true);
    return () => {
      window.removeEventListener('keydown', handleNavigationKeyDown, true);
      window.removeEventListener('keyup', handleNavigationKeyUp, true);
    };
  }, [hasKeyboardFocus, interactionEnabled, isInteractive]);

  useEffect(() => {
    if (!renderingEnabled || !surfaceRef.current) {
      return;
    }

    void surfaceRef.current.render(interactionEnabled && !presentationAspectRatio ? config : {
      ...config, viewport: updateAspectRatio(config.viewport, sizeRef.current.width / Math.max(sizeRef.current.height, 1)),
    });
  }, [config, renderingEnabled, interactionEnabled, presentationAspectRatio]);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const observer = new ResizeObserver(() => {
      resizeSurface();
    });

    observer.observe(canvasRef.current);
    resizeSurface();

    return () => observer.disconnect();
  }, [config.quality.pixelDensity, interactionEnabled, onConfigChange]);

  function resizeSurface() {
    const canvas = canvasRef.current;
    const surface = surfaceRef.current;

    if (!canvas || !surface) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return; // Hidden views retain their surface and last valid size.
    const pixelRatio = window.devicePixelRatio * configRef.current.quality.pixelDensity;
    const deviceWidth = rect.width * pixelRatio;
    const deviceHeight = rect.height * pixelRatio;
    sizeRef.current = {
      width: rect.width,
      height: rect.height,
    };

    surface.resize(deviceWidth, deviceHeight);

    const nextAspectRatio = rect.width / Math.max(rect.height, 1);
    if (!interactionEnabled || presentationAspectRatio) {
      // Presentation geometry must not write an evaluated frame back into authored state.
      configRef.current = { ...configRef.current, viewport: updateAspectRatio(configRef.current.viewport, nextAspectRatio) };
      void surface.render(configRef.current);
      return;
    }
    if (Math.abs(configRef.current.viewport.aspectRatio - nextAspectRatio) > 1e-6) {
      onConfigChange({
        ...configRef.current,
        viewport: updateAspectRatio(configRef.current.viewport, nextAspectRatio),
      });
      return;
    }

    void surface.render(configRef.current);
  }

  function getRelativePoint(event: ReactPointerEvent<HTMLCanvasElement> | ReactWheelEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!isInteractive || !interactionEnabled) {
      return;
    }

    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      distance: 0,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!isInteractive || !interactionEnabled) {
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    drag.distance += Math.hypot(deltaX, deltaY);
    drag.x = event.clientX;
    drag.y = event.clientY;

    onConfigChange({
      ...configRef.current,
      viewport: panViewport(configRef.current.viewport, { x: deltaX, y: deltaY }, sizeRef.current),
    });
    navigationCallbacksRef.current.onUserNavigate?.();
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!isInteractive || !interactionEnabled) {
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;

    if (drag.distance > POINT_SELECTION_DRAG_TOLERANCE || !onPointSelect) {
      return;
    }

    const point = getRelativePoint(event);
    onPointSelect(mapPixelToComplex(point, configRef.current.viewport, sizeRef.current));
  }

  function handleWheel(event: ReactWheelEvent<HTMLCanvasElement>) {
    if (!isInteractive || !interactionEnabled) {
      return;
    }

    event.preventDefault();
    const focusPoint = getRelativePoint(event);
    const zoomFactor = Math.exp(event.deltaY * 0.0015);

    onConfigChange({
      ...configRef.current,
      viewport: zoomViewport(configRef.current.viewport, focusPoint, sizeRef.current, zoomFactor),
    });
    navigationCallbacksRef.current.onUserNavigate?.();
  }

  function handleNavigationKeyDown(event: KeyboardEvent) {
    const actions = getActionsForKey(navigationSettingsRef.current, event.key);
    if (!isModifierKey(event.key)) {
      syncModifierActions(event);
    }
    if (actions.length === 0) {
      return;
    }

    event.preventDefault();

    for (const action of actions) {
      if (action === 'resetView') {
        if (!event.repeat) {
          navigationCallbacksRef.current.onRequestReset?.();
        }
        continue;
      }

      if (navigationActionDefinitionMap[action].kind === 'discrete') {
        navigationCallbacksRef.current.onDiscreteNavigationAction?.(action, event.shiftKey);
        continue;
      }

      const wasActive = activeActionsRef.current.has(action);
      activeActionsRef.current.add(action);
      if (!wasActive) {
        navigationCallbacksRef.current.onNavigationActionEvent?.({ action, phase: 'start' });
      }
    }
  }

  function handleNavigationKeyUp(event: KeyboardEvent) {
    const actions = getActionsForKey(navigationSettingsRef.current, event.key);
    if (!isModifierKey(event.key)) {
      syncModifierActions(event);
    }
    if (actions.length === 0) {
      return;
    }

    event.preventDefault();

    for (const action of actions) {
      if (activeActionsRef.current.delete(action)) {
        navigationCallbacksRef.current.onNavigationActionEvent?.({ action, phase: 'end' });
      }
    }
  }

  function handleBlur() {
    setHasKeyboardFocus(false);
    for (const action of activeActionsRef.current) {
      navigationCallbacksRef.current.onNavigationActionEvent?.({ action, phase: 'end' });
    }
    activeActionsRef.current.clear();
  }

  function syncModifierActions(event: KeyboardEvent) {
    const modifierKeys = [
      { key: 'Shift', active: event.shiftKey },
      { key: 'Control', active: event.ctrlKey },
      { key: 'Alt', active: event.altKey },
      { key: 'Meta', active: event.metaKey },
    ];

    for (const modifier of modifierKeys) {
      const actions = getActionsForKey(navigationSettingsRef.current, modifier.key);
      for (const action of actions) {
        if (modifier.active) {
          activeActionsRef.current.add(action);
        } else {
          activeActionsRef.current.delete(action);
        }
      }
    }
  }

  function isModifierKey(key: string): boolean {
    return key === 'Shift' || key === 'Control' || key === 'Alt' || key === 'Meta';
  }

  function activateKeyboardNavigation() {
    if (!interactionEnabled) {
      return;
    }

    canvasRef.current?.focus();
  }

  return (
    <section
      className="render-view"
      data-testid={viewId ? `${viewId}-view` : undefined}
      data-rendering-state={renderingEnabled ? 'active' : 'idle'}
    >
      <header className="render-view__header">
        <div>
          <p className="render-view__eyebrow">{title}</p>
          <h2>{formulaRegistry[config.fractal.formulaId]?.displayName ?? config.fractal.formulaId} Surface</h2>
        </div>
        <div className="render-view__header-actions"><div className="render-view__meta">
            <span>{subtitle}</span>
            <span>{backendLabel}</span>
            <span>Scale {formatNumber(toNumber(config.viewport.scale))}</span>
          </div>{headerAction}</div>
      </header>
      <div className={highlightForTutorial ? 'render-view__canvas-shell is-first-flight-target' : 'render-view__canvas-shell'}>
        <canvas
          ref={canvasRef}
          className={renderingEnabled ? 'render-view__canvas' : 'render-view__canvas render-view__canvas--idle'}
          data-testid={viewId ? `${viewId}-canvas` : undefined}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          onFocus={() => setHasKeyboardFocus(true)}
          onBlur={handleBlur}
        />
        {isInteractive && interactionEnabled ? (
          hasKeyboardFocus ? (
            <div className="render-view__focus-chip">Keyboard navigation active</div>
          ) : (
            <button
              type="button"
              className="render-view__focus-button"
              onClick={activateKeyboardNavigation}
            >
              Enable keyboard navigation
            </button>
          )
        ) : null}
        {isInteractive && !interactionEnabled ? (
          <div className="render-view__focus-chip">{interactionDisabledLabel}</div>
        ) : null}
        {renderError ? <div className="render-view__overlay render-view__overlay--error">{renderError}</div> : null}
        {diagnostics && !diagnostics.interactive ? (
          <div className="render-view__overlay render-view__overlay--diagnostic">
            <div className="render-view__overlay-copy">
              <p className="render-view__overlay-eyebrow">Renderer diagnostics</p>
              <h3>{diagnostics.summary}</h3>
              {diagnostics.failureMessage ? <p>{diagnostics.failureMessage}</p> : null}
              <ul className="render-view__overlay-list">
                {diagnostics.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
              {diagnostics.hints.length > 0 ? (
                <ul className="render-view__overlay-list render-view__overlay-list--hints">
                  {diagnostics.hints.map((hint) => (
                    <li key={hint}>{hint}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}
        {placeholder ? (
          <div
            className="render-view__overlay render-view__overlay--placeholder"
            data-testid={viewId ? `${viewId}-placeholder` : undefined}
          >
            <div className="render-view__overlay-copy">
              <p className="render-view__overlay-eyebrow">{placeholder.eyebrow}</p>
              <h3>{placeholder.title}</h3>
              <p>{placeholder.body}</p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function formatNumber(value: number): string {
  if (Math.abs(value) >= 1_000 || Math.abs(value) < 0.001) {
    return value.toExponential(3);
  }

  return value.toFixed(4);
}
