import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { exportAnimationImageSequence, exportAnimationWebm } from '../animation/export';
import { sampleAnimationBase } from '../animation/interpolation';
import { evaluateConfiguration, snapshotEffectiveConfig } from '../animation/evaluation';
import { normalizeEvaluatedConfig } from '../parameters/validateRenderConfig';
import {
  createAnimationKeyframe,
  createDefaultAnimationClip,
  createJourneyFromWaypoints,
  hasRecordedNavigation,
  removeAnimationKeyframe,
  upsertAnimationKeyframe,
} from '../animation/model';
import { buildClipFromRecordedNavigation } from '../animation/recording';
import { createDefaultComparisonConfig, setComparisonSynchronization, updateComparisonMode, updateComparisonSide } from '../comparison/model';
import { AnimationPanel } from '../components/AnimationPanel';
import { FirstFlightTutorial } from '../components/FirstFlightTutorial';
import { ComparisonPanel } from '../components/ComparisonPanel';
import { ComparisonStage } from '../components/ComparisonStage';
import { DiscoverPanel } from '../components/DiscoverPanel';
import { PaletteEditor } from '../components/PaletteEditor';
import { RenderView } from '../components/RenderView';
import { SettingsPortal } from '../components/SettingsPortal';
import { WaypointPanel } from '../components/WaypointPanel';
import { WorkspaceModeNav } from '../components/WorkspaceModeNav';
import { VisualLab } from '../components/VisualLab';
import { PerformPanel } from '../components/PerformPanel';
import { applyPerformanceOverrides, type PerformanceOverrides } from '../performance/model';
import type { MappingEvaluation } from '../visuals/modulation/runtime';
import { formulaRegistry } from '../fractals/registry';
import { MultibrotControls } from '../components/MultibrotControls';
import { NewtonControls } from '../components/NewtonControls';
import { PhoenixControls } from '../components/PhoenixControls';
import { resolveCompatibleRenderConfig } from '../visuals/materials/registry';
import { complexFromNumbers } from '../math/complex';
import { toNumber } from '../math/doubleSingle';
import { getCuratedWaypoints } from '../navigation/curatedWaypoints';
import { createDefaultDiscoveryOptions, runDiscoveryScan } from '../navigation/discovery';
import { applyJuliaParameterAction } from '../navigation/juliaParameters';
import { normalizeKeyboardKey, updateNavigationBinding } from '../navigation/keyboard';
import { createDefaultNavigationSettings } from '../navigation/settings';
import { renderWaypointThumbnail } from '../navigation/thumbnails';
import { resetJuliaViewport } from '../navigation/viewport';
import { applyNavigationFrame } from '../navigation/motion';
import { midiCcDeltaToZoom } from '../integrations/midi/controlChange';
import { cloneRenderConfig, createWaypoint } from '../navigation/waypoints';
import { loadNavigationSettings, loadWaypoints, saveNavigationSettings, saveWaypoints } from '../persistence/storage';
import { encodeRenderConfigToUrlParam, readRenderConfigFromLocation, writeRenderConfigToHistory } from '../persistence/urlState';
import { analyzeDeepZoom } from '../rendering/deepZoomDiagnostics';
import type { RendererDiagnostics } from '../rendering/diagnostics';
import type {
  NavigationActionId,
  NavigationSettings,
  RecordedNavigationEvent,
  DoubleSingleComplex,
  FormulaId,
  RenderConfig,
  ViewportConfig,
  Waypoint,
} from '../types/config';
import { createDefaultRenderConfig } from './defaultConfig';
import { getJuliaPanelPresentation } from './juliaPanel';
import type { WorkspaceModeId } from './workspaceModes';
import { advanceFirstFlight, createFirstFlightRenderConfig, type FirstFlightState } from './firstFlight';

import './styles/app.css';

export function App() {
  const [mainConfig, setMainConfig] = useState<RenderConfig>(() =>
    readRenderConfigFromLocation() ?? createDefaultRenderConfig('mandelbrot'),
  );
  const [juliaConfig, setJuliaConfig] = useState<RenderConfig>(() => createDefaultRenderConfig('julia'));
  const [juliaSeed, setJuliaSeed] = useState<DoubleSingleComplex | null>(null);
  const [showJuliaPanel, setShowJuliaPanel] = useState(true);
  const [rendererDiagnostics, setRendererDiagnostics] = useState<RendererDiagnostics | null>(null);
  const [navigationSettings, setNavigationSettings] = useState<NavigationSettings>(() =>
    loadNavigationSettings(createDefaultNavigationSettings()),
  );
  const [rebindingAction, setRebindingAction] = useState<NavigationActionId | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>(() => [...loadWaypoints(), ...getCuratedWaypoints()]);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [discoveryOptions, setDiscoveryOptions] = useState(createDefaultDiscoveryOptions);
  const [discoveryResults, setDiscoveryResults] = useState<Waypoint[]>([]);
  const [discoveryStatus, setDiscoveryStatus] = useState<string | null>(null);
  const [scannedTiles, setScannedTiles] = useState(0);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonConfig, setComparisonConfig] = useState(() => createDefaultComparisonConfig(mainConfig));
  const [activeWorkspaceMode, setActiveWorkspaceMode] = useState<WorkspaceModeId>('palette');
  const [workspace, setWorkspace] = useState<'explore' | 'perform'>('explore');
  const [previewKind, setPreviewKind] = useState<'journey' | 'internal'>('journey');
  const [overrides, setOverrides] = useState<PerformanceOverrides>({});
  const [midiOverrides, setMidiOverrides] = useState<PerformanceOverrides>({});
  const [midiViewport, setMidiViewport] = useState<ViewportConfig | null>(null);
  const [showSettingsPortal, setShowSettingsPortal] = useState(false);
  const [animationClip, setAnimationClip] = useState(() => createDefaultAnimationClip(mainConfig));
  const [isPlayingAnimation, setIsPlayingAnimation] = useState(false);
  const [previewTimeMs, setPreviewTimeMs] = useState<number | null>(null);
  const [playbackClip, setPlaybackClip] = useState<typeof animationClip | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<string | null>(null);
  const [isRecordingNavigation, setIsRecordingNavigation] = useState(false);
  const [recordedNavigationEvents, setRecordedNavigationEvents] = useState<RecordedNavigationEvent[]>([]);
  const [selectedStartWaypointId, setSelectedStartWaypointId] = useState('');
  const [selectedEndWaypointId, setSelectedEndWaypointId] = useState('');
  const [firstFlightState, setFirstFlightState] = useState<FirstFlightState>('navigate');
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const exploreWorkspaceButtonRef = useRef<HTMLButtonElement | null>(null);
  const playbackFrameRef = useRef<number | null>(null);
  const playbackElapsedRef = useRef(0);
  const playbackStartedAtRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const recordingBaseConfigRef = useRef<RenderConfig | null>(null);
  const previewActive = previewTimeMs !== null;
  const preview = useMemo<{ config: RenderConfig; issues: string[]; mappings?: MappingEvaluation[]; failed?: boolean }>(() => {
    if (previewTimeMs === null) return { config: mainConfig, issues: [] as string[] };
    try {
      const input = previewKind === 'internal' ? mainConfig : sampleAnimationBase(playbackClip ?? animationClip, previewTimeMs);
      const result = evaluateConfiguration(input, previewTimeMs / 1000);
      const config = applyPerformanceOverrides(result.config, { ...overrides, ...midiOverrides });
      return { ...result, config: midiViewport ? { ...config, viewport: midiViewport } : config };
    }
    catch (error) {
      let fallback = createDefaultRenderConfig('mandelbrot');
      try { fallback = normalizeEvaluatedConfig(mainConfig); } catch { /* Never render the invalid candidate. */ }
      return { config: fallback, issues: [error instanceof Error ? error.message : 'Invalid Journey frame.'], failed: true };
    }
  }, [mainConfig, animationClip, playbackClip, previewTimeMs, previewKind, overrides, midiOverrides, midiViewport]);
  const effectiveConfig = preview.config;
  const previewActiveRef = useRef(previewActive);
  previewActiveRef.current = previewActive || workspace === 'perform' || showComparison;
  const handlePrimarySurfaceChange = useCallback((next: RenderConfig) => {
    // Surface callbacks may outlive the render that created them. They own viewport only.
    if (!previewActiveRef.current) setMainConfig((current) => ({ ...current, viewport: next.viewport }));
  }, []);

  useEffect(() => {
    if (preview.failed) setIsPlayingAnimation(false);
  }, [preview.failed]);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden) {
        setIsPlayingAnimation(false);
        setPlaybackStatus('Primary paused while the page is hidden. Resume when ready.');
      }
    };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
  }, []);

  const userWaypoints = useMemo(
    () => waypoints.filter((waypoint) => waypoint.source === 'user'),
    [waypoints],
  );
  const frameCount = Math.max(2, Math.round(animationClip.durationMs / 1000 * Math.max(1, Math.round(animationClip.fps))) + 1);
  const deepZoomDiagnostics = useMemo(() => analyzeDeepZoom(mainConfig), [mainConfig]);
  const juliaPanelPresentation = useMemo(
    () => getJuliaPanelPresentation(mainConfig.fractal.formulaId, juliaSeed !== null),
    [juliaSeed, mainConfig.fractal.formulaId],
  );

  useEffect(() => {
    if (!juliaSeed) {
      return;
    }

    setJuliaConfig((current) => ({
      ...current,
      material: mainConfig.material,
      lens: mainConfig.lens,
      palette: mainConfig.palette,
      quality: mainConfig.quality,
      fractal: {
        ...current.fractal,
        formulaId: 'julia',
        parameters: {
          cReal: toNumber(juliaSeed.re),
          cImag: toNumber(juliaSeed.im),
        },
        maxIterations: mainConfig.fractal.maxIterations,
        bailout: mainConfig.fractal.bailout,
      },
    }));
  }, [juliaSeed, mainConfig.material, mainConfig.lens, mainConfig.fractal.bailout, mainConfig.fractal.maxIterations, mainConfig.palette, mainConfig.quality]);

  useEffect(() => {
    saveNavigationSettings(navigationSettings);
  }, [navigationSettings]);

  useEffect(() => {
    saveWaypoints(userWaypoints);
  }, [userWaypoints]);

  useEffect(() => {
    writeRenderConfigToHistory(mainConfig, 'replace');
  }, [mainConfig]);

  useEffect(() => {
    function handlePopState() {
      const fromUrl = readRenderConfigFromLocation();
      if (fromUrl) {
        handleStopPlayback();
        setMainConfig(fromUrl);
      }
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!rebindingAction) {
      return;
    }

    const actionToRebind = rebindingAction;

    function handleKeyCapture(event: KeyboardEvent) {
      event.preventDefault();

      if (event.key === 'Escape') {
        setRebindingAction(null);
        return;
      }

      setNavigationSettings((current) =>
        updateNavigationBinding(current, actionToRebind, normalizeKeyboardKey(event.key)),
      );
      setRebindingAction(null);
    }

    window.addEventListener('keydown', handleKeyCapture, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyCapture, { capture: true });
    };
  }, [rebindingAction]);

  useEffect(() => {
    if (!shareStatus) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShareStatus(null);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [shareStatus]);

  useEffect(() => {
    if (!selectedStartWaypointId && waypoints[0]) {
      setSelectedStartWaypointId(waypoints[0].id);
    }

    if (!selectedEndWaypointId && waypoints[1]) {
      setSelectedEndWaypointId(waypoints[1].id);
      return;
    }

    if (!selectedEndWaypointId && waypoints[0]) {
      setSelectedEndWaypointId(waypoints[0].id);
    }
  }, [selectedEndWaypointId, selectedStartWaypointId, waypoints]);

  useEffect(() => {
    if (!isPlayingAnimation) {
      if (playbackFrameRef.current !== null) {
        window.cancelAnimationFrame(playbackFrameRef.current);
        playbackFrameRef.current = null;
      }
      playbackStartedAtRef.current = null;
      return;
    }

    function tick(timestamp: number) {
      const clip = playbackClip ?? animationClip;
      const startedAt = playbackStartedAtRef.current ?? (timestamp - playbackElapsedRef.current);
      playbackStartedAtRef.current = startedAt;
      const elapsed = previewKind === 'internal' ? timestamp - startedAt : Math.min(clip.durationMs, timestamp - startedAt);
      playbackElapsedRef.current = elapsed;
      setPreviewTimeMs(elapsed);
      if (previewKind === 'journey') setPlaybackStatus(`Playing ${clip.name} at ${clip.fps} FPS target`);

      if (previewKind === 'journey' && elapsed >= clip.durationMs) {
        setIsPlayingAnimation(false);
        setPlaybackStatus(`Journey complete: ${clip.name}. Preview held; Stop restores the authored base.`);
        return;
      }

      playbackFrameRef.current = window.requestAnimationFrame(tick);
    }

    playbackFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (playbackFrameRef.current !== null) {
        window.cancelAnimationFrame(playbackFrameRef.current);
        playbackFrameRef.current = null;
      }
    };
  }, [animationClip, playbackClip, isPlayingAnimation, previewKind]);

  function handleMainFormulaChange(formulaId: FormulaId) {
    setMainConfig((current) => {
      const next = createDefaultRenderConfig(formulaId);
      const nextConfig = {
        ...next,
        palette: current.palette,
        material: current.material,
        lens: current.lens,
        quality: current.quality,
        modulations: current.modulations.map((entry) => ({ ...entry, enabled: false })),
        ...(current.modulationProgram ? { modulationProgram: {
          ...structuredClone(current.modulationProgram), mappings: current.modulationProgram.mappings.map((entry) => ({ ...structuredClone(entry), enabled: false })),
        } } : {}),
      };
      writeRenderConfigToHistory(nextConfig, 'push');
      return resolveCompatibleRenderConfig(nextConfig);
    });
  }

  function handleJuliaSeedSelect(point: DoubleSingleComplex) {
    setJuliaSeed(point);
    setShowJuliaPanel(true);
    setJuliaConfig((current) => ({
      ...current,
      viewport: resetJuliaViewport(current.viewport.aspectRatio),
    }));
    completeFirstFlightAction('linkJulia');
  }

  function updateMainJuliaParameter(name: 'cReal' | 'cImag', value: number) {
    setMainConfig((current) => ({
      ...current,
      fractal: {
        ...current.fractal,
        parameters: {
          ...current.fractal.parameters,
          [name]: value,
        },
      },
    }));
  }

  function updateLinkedJuliaParameter(name: 'cReal' | 'cImag', value: number) {
    const cReal = name === 'cReal' ? value : (juliaConfig.fractal.parameters.cReal ?? -0.8);
    const cImag = name === 'cImag' ? value : (juliaConfig.fractal.parameters.cImag ?? 0.156);
    setJuliaSeed(complexFromNumbers(cReal, cImag));
    completeFirstFlightAction('tuneJulia');
  }

  function handleLinkedJuliaNavigationAction(action: NavigationActionId, precisionMode: boolean) {
    if (!juliaSeed) {
      return;
    }

    const parameters = applyJuliaParameterAction(juliaConfig.fractal.parameters, action, precisionMode);
    if (parameters === juliaConfig.fractal.parameters) {
      return;
    }

    setJuliaSeed(complexFromNumbers(
      parameters.cReal ?? -0.8,
      parameters.cImag ?? 0.156,
    ));
    completeFirstFlightAction('tuneJulia');
  }

  function handleMainDiscreteNavigationAction(action: NavigationActionId, precisionMode: boolean) {
    if (mainConfig.fractal.formulaId !== 'julia') {
      handleLinkedJuliaNavigationAction(action, precisionMode);
      return;
    }

    setMainConfig((current) => {
      if (current.fractal.formulaId !== 'julia') {
        return current;
      }

      const parameters = applyJuliaParameterAction(current.fractal.parameters, action, precisionMode);
      if (parameters === current.fractal.parameters) {
        return current;
      }

      return {
        ...current,
        fractal: {
          ...current.fractal,
          parameters,
        },
      };
    });
  }

  function resetMainView() {
    setMainConfig((current) => {
      const next = createDefaultRenderConfig(current.fractal.formulaId);
      const nextConfig = {
        ...next,
        palette: current.palette,
        material: current.material,
        lens: current.lens,
        quality: current.quality,
        modulations: current.modulations,
        ...(current.modulationProgram ? { modulationProgram: current.modulationProgram } : {}),
      };
      writeRenderConfigToHistory(nextConfig, 'push');
      return nextConfig;
    });
  }

  function resetNavigationSettings() {
    setNavigationSettings(createDefaultNavigationSettings());
    setRebindingAction(null);
  }

  function updateSharedPalette(updater: (palette: RenderConfig['palette']) => RenderConfig['palette']) {
    setMainConfig((current) => ({
      ...current,
      palette: updater(current.palette),
    }));

    setJuliaConfig((current) => ({
      ...current,
      palette: updater(current.palette),
    }));
  }

  function handleLoadWaypoint(waypoint: Waypoint) {
    handleStopPlayback();
    const next = cloneRenderConfig(waypoint.renderConfig);
    writeRenderConfigToHistory(next, 'push');
    setMainConfig(next);
  }

  function updateComparisonConfig(updater: (current: typeof comparisonConfig) => typeof comparisonConfig) {
    setComparisonConfig((current) => updater(current));
  }

  function handleComparisonSideConfigChange(side: 'left' | 'right', config: RenderConfig) {
    setComparisonConfig((current) => updateComparisonSide(current, side, config));
  }

  function handleLoadExploreToComparisonSide(side: 'left' | 'right') {
    setComparisonConfig((current) => updateComparisonSide(current, side, mainConfig));
  }

  function handleResetComparisonSide(side: 'left' | 'right') {
    setComparisonConfig((current) => {
      const source = side === 'left' ? current.left : current.right;
      const reset = createDefaultRenderConfig(source.fractal.formulaId);
      const next = {
        ...reset,
        palette: source.palette,
        material: source.material,
        lens: source.lens,
        quality: source.quality,
      };
      return updateComparisonSide(current, side, next);
    });
  }

  function handleAddCurrentKeyframe() {
    setAnimationClip((current) => {
      const slot = current.keyframes.length / Math.max(current.keyframes.length + 1, 1);
      return upsertAnimationKeyframe(current, createAnimationKeyframe({
        label: `Keyframe ${current.keyframes.length + 1}`,
        time: Math.min(1, Number(slot.toFixed(2))),
        renderConfig: previewActive ? snapshotEffectiveConfig(effectiveConfig) : mainConfig,
      }));
    });
  }

  function handleCaptureCurrentToKeyframe(keyframeId: string) {
    setAnimationClip((current) => {
      const keyframe = current.keyframes.find((entry) => entry.id === keyframeId);
      if (!keyframe) {
        return current;
      }

      return upsertAnimationKeyframe(current, {
        ...keyframe,
        renderConfig: previewActive ? snapshotEffectiveConfig(effectiveConfig) : mainConfig,
      });
    });
  }

  function handleLoadKeyframe(keyframeId: string) {
    handleStopPlayback();
    const keyframe = animationClip.keyframes.find((entry) => entry.id === keyframeId);
    if (!keyframe) {
      return;
    }

    playbackElapsedRef.current = keyframe.time * animationClip.durationMs;
    setMainConfig(cloneRenderConfig(keyframe.renderConfig));
  }

  function handleBuildJourneyFromWaypoints() {
    const start = waypoints.find((waypoint) => waypoint.id === selectedStartWaypointId);
    const end = waypoints.find((waypoint) => waypoint.id === selectedEndWaypointId);
    if (!start || !end) {
      setPlaybackStatus('Select two Waypoints to build a journey.');
      return;
    }

    setAnimationClip(createJourneyFromWaypoints(start, end));
    setPlaybackStatus(`Journey created from ${start.name} to ${end.name}`);
  }

  function handleStartPlayback() {
    if (isRecordingNavigation) handleStopRecordingNavigation();
    if (animationClip.keyframes.length < 2) {
      setPlaybackStatus('Add at least two keyframes to play a journey.');
      return;
    }

    setPreviewKind('journey');
    setOverrides({});
    setMidiViewport(null);
    playbackElapsedRef.current = 0;
    playbackStartedAtRef.current = null;
    setPreviewTimeMs(0);
    setPlaybackClip(structuredClone(animationClip));
    setIsPlayingAnimation(true);
  }

  function handleStopPlayback() {
    setOverrides({});
    setMidiViewport(null);
    setIsPlayingAnimation(false);
    setPreviewTimeMs(null);
    setPlaybackClip(null);
    playbackElapsedRef.current = 0;
    playbackStartedAtRef.current = null;
    setPlaybackStatus(`Playback stopped. ${frameCount} deterministic frames are ready to export.`);
  }

  function handleStartPerformance() {
    if (isRecordingNavigation) handleStopRecordingNavigation();
    setPreviewKind('internal');
    setOverrides({});
    setMidiViewport(null);
    playbackElapsedRef.current = 0;
    playbackStartedAtRef.current = null;
    setPlaybackClip(null);
    setPreviewTimeMs(0);
    setIsPlayingAnimation(true);
  }

  function handleStartRecordingNavigation() {
    handleStopPlayback();
    setActiveWorkspaceMode('journey');
    setShowComparison(false);
    setIsRecordingNavigation(true);
    setRecordedNavigationEvents([]);
    recordingStartedAtRef.current = performance.now();
    recordingBaseConfigRef.current = cloneRenderConfig(mainConfig);
    setPlaybackStatus('Semantic navigation capture is active on the main view.');
  }

  function handleStopRecordingNavigation() {
    setIsRecordingNavigation(false);
    recordingStartedAtRef.current = null;
    setPlaybackStatus(`Captured ${recordedNavigationEvents.length} navigation events.`);
  }

  function handleNavigationActionEvent(event: { action: NavigationActionId; phase: 'start' | 'end' }) {
    if (!isRecordingNavigation || recordingStartedAtRef.current === null) {
      return;
    }

    const timestampMs = performance.now() - recordingStartedAtRef.current;
    setRecordedNavigationEvents((current) => [
      ...current,
      {
        timestampMs,
        action: event.action,
        phase: event.phase,
      },
    ]);
  }

  function handleBuildJourneyFromRecording() {
    if (!hasRecordedNavigation(recordedNavigationEvents) || !recordingBaseConfigRef.current) {
      setPlaybackStatus('Record some movement first to build a journey from navigation.');
      return;
    }

    const clip = buildClipFromRecordedNavigation(
      recordingBaseConfigRef.current,
      navigationSettings,
      recordedNavigationEvents,
    );
    if (!clip) {
      setPlaybackStatus('Unable to build a journey from the current recording.');
      return;
    }

    setAnimationClip(clip);
    setActiveWorkspaceMode('journey');
    setPlaybackStatus(`Journey created from ${recordedNavigationEvents.length} recorded actions.`);
  }

  async function handleSaveWaypoint(draft: { name: string; description: string }) {
    return saveWaypointConfig(draft, capturePrimaryFrame());
  }

  function capturePrimaryFrame() {
    const captured = snapshotEffectiveConfig(effectiveConfig);
    const rect = mainCanvasRef.current?.getBoundingClientRect();
    if (rect && rect.height > 0) captured.viewport.aspectRatio = rect.width / rect.height;
    return captured;
  }

  async function saveWaypointConfig(draft: { name: string; description: string }, renderConfig: RenderConfig) {
    const thumbnailDataUrl = await renderWaypointThumbnail(renderConfig);
    const waypoint = createWaypoint({
      name: draft.name || `${renderConfig.fractal.formulaId} waypoint`,
      description: draft.description,
      renderConfig,
      source: 'user',
      tags: [renderConfig.fractal.formulaId],
      thumbnailDataUrl,
    });

    setWaypoints((current) => [waypoint, ...current]);
    completeFirstFlightAction('saveWaypoint');
  }

  function completeFirstFlightAction(action: Exclude<FirstFlightState, 'complete' | 'dismissed'>) {
    setFirstFlightState((current) => advanceFirstFlight(current, action));
  }

  function startFirstFlight() {
    handleStopPlayback();
    setWorkspace('explore');
    setFirstFlightState('navigate');
    setShowComparison(false);
    setShowJuliaPanel(true);
    setJuliaSeed(null);
    setActiveWorkspaceMode('palette');
    setMainConfig((current) => {
      const next = createFirstFlightRenderConfig(current);
      writeRenderConfigToHistory(next, 'push');
      return next;
    });
  }

  function openSettings() {
    setShowSettingsPortal(true);
    completeFirstFlightAction('openSettings');
  }

  function finishFirstFlightControlReview() {
    completeFirstFlightAction('reviewControls');
    setShowSettingsPortal(false);
    setActiveWorkspaceMode('waypoints');
  }

  function handleUpdateWaypoint(updated: Waypoint) {
    setWaypoints((current) => current.map((waypoint) => waypoint.id === updated.id ? updated : waypoint));
  }

  async function handleRefreshWaypointFromCurrent(waypointId: string) {
    const renderConfig = capturePrimaryFrame();
    const thumbnailDataUrl = await renderWaypointThumbnail(renderConfig);

    setWaypoints((current) => current.map((waypoint) => waypoint.id === waypointId
      ? {
        ...waypoint,
        ...createWaypoint({
          name: waypoint.name,
          description: waypoint.description,
          renderConfig,
          source: 'user',
          tags: waypoint.tags,
          thumbnailDataUrl,
        }),
        id: waypoint.id,
        createdAt: waypoint.createdAt,
      }
      : waypoint));
  }

  function handlePromoteWaypoint(waypoint: Waypoint) {
    setWaypoints((current) => [
      createWaypoint({
        name: waypoint.name,
        description: waypoint.description,
        renderConfig: waypoint.renderConfig,
        source: 'user',
        tags: waypoint.tags,
        thumbnailDataUrl: waypoint.thumbnailDataUrl,
      }),
      ...current,
    ]);
  }

  function handleClearDiscoveredWaypoints() {
    setWaypoints((current) => current.filter((waypoint) => waypoint.source !== 'discovered'));
  }

  function handleDeleteWaypoint(waypointId: string) {
    setWaypoints((current) => current.filter((waypoint) => waypoint.id !== waypointId));
  }

  async function handleCopyShareLink() {
    const url = new URL(window.location.href);
    url.searchParams.set('view', encodeRenderConfigToUrlParam(capturePrimaryFrame()));

    try {
      await navigator.clipboard.writeText(url.toString());
      setShareStatus('Share link copied');
    } catch {
      setShareStatus('Unable to copy link automatically');
    }
  }

  async function handleExportImageSequence() {
    try {
      setPlaybackStatus(`Exporting ${frameCount} PNG frames...`);
      const count = await exportAnimationImageSequence(animationClip, sanitizeFilename(animationClip.name));
      setPlaybackStatus(`Exported ${count} PNG frames plus a manifest file.`);
    } catch (error) {
      setPlaybackStatus(error instanceof Error ? error.message : 'Unable to export the image sequence.');
    }
  }

  async function handleExportWebm() {
    try {
      setPlaybackStatus(`Recording WebM from ${frameCount} deterministic frames...`);
      await exportAnimationWebm(animationClip, `${sanitizeFilename(animationClip.name)}.webm`);
      setPlaybackStatus('WebM export finished.');
    } catch (error) {
      setPlaybackStatus(error instanceof Error ? error.message : 'Unable to export the WebM journey.');
    }
  }

  function handleRunDiscovery() {
    setActiveWorkspaceMode('discover');
    setDiscoveryStatus('Scanning nested tiles from the current view...');

    window.setTimeout(() => {
      const run = runDiscoveryScan(mainConfig, discoveryOptions);
      setDiscoveryResults(run.waypoints);
      setScannedTiles(run.scannedTiles);
      setDiscoveryStatus(`Found ${run.waypoints.length} candidate Waypoints from ${run.scannedTiles} sampled tiles.`);
      setWaypoints((current) => {
        const persistent = current.filter((waypoint) => waypoint.source !== 'discovered');
        return [...run.waypoints, ...persistent];
      });
    }, 0);
  }

  function renderActiveWorkspacePanel() {
    switch (activeWorkspaceMode) {
      case 'visualLab':
        return <VisualLab config={mainConfig} onChange={(updater) => setMainConfig((current) => updater(current))} />;
      case 'palette':
        return (
          <PaletteEditor
            palette={mainConfig.palette}
            onChange={(nextPalette) => updateSharedPalette(() => nextPalette)}
          />
        );
      case 'waypoints':
        return (
          <WaypointPanel
            activeConfig={effectiveConfig}
            waypoints={waypoints}
            onSaveWaypoint={handleSaveWaypoint}
            onSaveBaseWaypoint={() => saveWaypointConfig({ name: `${mainConfig.fractal.formulaId} base`, description: 'Authored configuration with motion definitions.' }, cloneRenderConfig(mainConfig))}
            onLoadWaypoint={handleLoadWaypoint}
            onDeleteWaypoint={handleDeleteWaypoint}
            onClearDiscoveredWaypoints={handleClearDiscoveredWaypoints}
            onRefreshWaypointFromCurrent={handleRefreshWaypointFromCurrent}
            onPromoteWaypoint={handlePromoteWaypoint}
            onUpdateWaypoint={handleUpdateWaypoint}
            onCopyShareLink={handleCopyShareLink}
            highlightSaveAction={firstFlightState === 'saveWaypoint'}
          />
        );
      case 'discover':
        return (
          <DiscoverPanel
            options={discoveryOptions}
            discoveryResults={discoveryResults}
            scannedTiles={scannedTiles}
            status={discoveryStatus}
            onOptionsChange={(updater) => setDiscoveryOptions((current) => updater(current))}
            onRunDiscovery={handleRunDiscovery}
            onLoadWaypoint={handleLoadWaypoint}
          />
        );
      case 'compare':
        return (
          <ComparisonPanel
            enabled={showComparison}
            comparison={comparisonConfig}
            onToggleEnabled={() => {
              setComparisonConfig((current) => updateComparisonSide(current, 'left', mainConfig));
              setShowComparison((current) => !current);
            }}
            onModeChange={(mode) => setComparisonConfig((current) => updateComparisonMode(current, mode))}
            onSyncChange={(enabled) => setComparisonConfig((current) => setComparisonSynchronization(current, enabled))}
            onActiveSideChange={(side) =>
              setComparisonConfig((current) => ({
                ...current,
                activeSide: side,
              }))
            }
            onComparisonChange={updateComparisonConfig}
            onSideConfigChange={(side, updater) => {
              setComparisonConfig((current) => updateComparisonSide(current, side, updater(side === 'left' ? current.left : current.right)));
            }}
            onLoadExploreToSide={handleLoadExploreToComparisonSide}
          />
        );
      case 'journey':
        return (
          <AnimationPanel
            clip={animationClip}
            activeConfig={mainConfig}
            waypoints={waypoints}
            recordedEvents={recordedNavigationEvents}
            isPlaying={isPlayingAnimation}
            isRecordingNavigation={isRecordingNavigation}
            playbackStatus={playbackStatus}
            selectedStartWaypointId={selectedStartWaypointId}
            selectedEndWaypointId={selectedEndWaypointId}
            onClipChange={setAnimationClip}
            onAddCurrentKeyframe={handleAddCurrentKeyframe}
            onCaptureCurrentToKeyframe={handleCaptureCurrentToKeyframe}
            onRemoveKeyframe={(keyframeId) => setAnimationClip((current) => removeAnimationKeyframe(current, keyframeId))}
            onLoadKeyframe={handleLoadKeyframe}
            onStartPlayback={handleStartPlayback}
            onStopPlayback={handleStopPlayback}
            onStartRecordingNavigation={handleStartRecordingNavigation}
            onStopRecordingNavigation={handleStopRecordingNavigation}
            onBuildJourneyFromWaypoints={handleBuildJourneyFromWaypoints}
            onBuildJourneyFromRecording={handleBuildJourneyFromRecording}
            onSetSelectedStartWaypointId={setSelectedStartWaypointId}
            onSetSelectedEndWaypointId={setSelectedEndWaypointId}
            onExportImageSequence={handleExportImageSequence}
            onExportWebm={handleExportWebm}
            navigationSettings={navigationSettings}
          />
        );
      default:
        return null;
    }
  }

  return (
    <main className="app-shell">
      <FirstFlightTutorial
        state={firstFlightState}
        onSkip={() => setFirstFlightState('dismissed')}
        onRestart={startFirstFlight}
        onContinue={finishFirstFlightControlReview}
      />
      <section className="hero">
        <div className="hero__copy">
          <p className="hero__eyebrow">Fractal Waypoints / The Instrument</p>
          <h1>{workspace === 'perform' ? 'One world. Play its relationships.' : 'Explore Mandelbrot space, then peel open Julia worlds from any point.'}</h1>
          {!previewActive && workspace === 'explore' ? <p>
            Explore the mathematics, then shape the look in Visual Lab: materials read
            orbit metrics while lens treatment refines the completed image.
          </p> : null}
          <div className="control-panel__section workspace-transport">
          <nav aria-label="Workspace" className="perform-actions">
            <button ref={exploreWorkspaceButtonRef} type="button" aria-pressed={workspace === 'explore'} onClick={() => setWorkspace('explore')}>Explore</button>
            <button type="button" aria-pressed={workspace === 'perform'} onClick={() => { if (isRecordingNavigation) handleStopRecordingNavigation(); setWorkspace('perform'); }}>Perform</button>
            <button type="button" className={firstFlightState === 'openSettings' ? 'is-first-flight-target' : undefined} onClick={openSettings}>Settings</button>
          </nav>
          <strong>{workspace === 'perform' ? 'Performing' : 'Scope'}: Primary · {formulaRegistry[effectiveConfig.fractal.formulaId].displayName}</strong>
          {effectiveConfig.fractal.formulaId !== mainConfig.fractal.formulaId ? <small>Authored formula: {formulaRegistry[mainConfig.fractal.formulaId].displayName}; Journey is previewing another formula.</small> : null}
          {isRecordingNavigation ? <div role="status"><span>Navigation capture · Primary · not a performance take</span><button type="button" onClick={handleStopRecordingNavigation}>Stop navigation capture</button></div> : null}
          {workspace === 'perform' && showComparison ? <small>Compare is preserved in Explore; its selected side is not Primary.</small> : null}
          {previewActive ? <div className="primary-transport">
            <strong role="status">{previewKind === 'internal' ? 'Internal motion' : 'Journey'} {isPlayingAnimation ? 'playing' : previewKind === 'journey' && previewTimeMs >= (playbackClip ?? animationClip).durationMs ? 'complete' : 'paused'} · Primary preview</strong>
            <span data-testid="transport-time">{(previewTimeMs / 1000).toFixed(2)} s</span>
            <small>Base settings and URL are unchanged. Stop restores base and clears overrides.</small>
            <div className="perform-actions">
              <button type="button" onClick={() => setIsPlayingAnimation(!isPlayingAnimation)} disabled={preview.failed || (!isPlayingAnimation && previewKind === 'journey' && previewTimeMs >= (playbackClip ?? animationClip).durationMs)}>{isPlayingAnimation ? `Pause ${previewKind === 'internal' ? 'motion' : 'Journey'}` : `Resume ${previewKind === 'internal' ? 'motion' : 'Journey'}`}</button>
              <button type="button" onClick={handleStopPlayback}>Stop and edit base</button>
            </div>
            {preview.issues.length ? <details className="perform-warning"><summary>{preview.issues.length} evaluation warning(s) · skipped or failed</summary>{preview.issues.map((issue, index) => <p key={index}>{issue}</p>)}</details> : null}
          </div> : workspace === 'perform' ? <div className="primary-transport"><span>Stopped · authored base · 0.00 s</span><button type="button" onClick={handleStartPerformance}>Play internal motion</button></div> : null}
          </div>
        </div>
        <div className="hero__status-card">
          <span>Renderer</span>
          <strong>{rendererDiagnostics?.backendLabel ?? 'WebGPU-first'}</strong>
          <span>Precision</span>
          <strong>Double-single viewport path</strong>
          <span>Workspace</span>
          <strong>{workspace === 'perform' ? 'Perform' : activeWorkspaceMode}</strong>
          <span>{frameCount} journey frames ready</span>
          {shareStatus ? <span>{shareStatus}</span> : null}
        </div>
      </section>

      <section className="workspace">
        <aside className={workspace === 'perform' ? 'control-panel control-panel--perform' : 'control-panel'}>
          <div className="control-panel__essentials" style={workspace === 'perform' ? { display: 'none' } : undefined}>
            <div className="control-panel__section control-panel__section--compact">
              <p className="control-panel__label">Explore · authored base</p>
              <strong>{formulaRegistry[mainConfig.fractal.formulaId].displayName}</strong>
              <span className="control-panel__section-copy">
                Drag to pan, scroll to zoom, then click a surface to enable keyboard flight.
              </span>
            </div>

            <fieldset disabled={previewActive} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <div className="control-panel__section">
              <p className="control-panel__label">Formula</p>
              <select
                value={mainConfig.fractal.formulaId}
                onChange={(event) => handleMainFormulaChange(event.target.value as FormulaId)}
              >
                {Object.values(formulaRegistry).map((formula) => (
                  <option key={formula.id} value={formula.id}>
                    {formula.displayName}
                  </option>
                ))}
              </select>
            </div>

            <MultibrotControls config={mainConfig} onChange={setMainConfig} />
            <NewtonControls config={mainConfig} onChange={setMainConfig} />
            <PhoenixControls config={mainConfig} onChange={setMainConfig} />
            {mainConfig.fractal.formulaId === 'julia' ? (
              <div className="control-panel__section control-panel__grid">
                <label>
                  <span>Julia real</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={mainConfig.fractal.parameters.cReal ?? -0.8}
                    onChange={(event) => updateMainJuliaParameter('cReal', Number(event.target.value))}
                  />
                </label>
                <label>
                  <span>Julia imaginary</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={mainConfig.fractal.parameters.cImag ?? 0.156}
                    onChange={(event) => updateMainJuliaParameter('cImag', Number(event.target.value))}
                  />
                </label>
              </div>
            ) : null}

            <div className="control-panel__section control-panel__grid control-panel__grid--explore">
            <label>
              <span>Iterations</span>
              <input
                type="range"
                min="64"
                max="512"
                step="8"
                value={mainConfig.fractal.maxIterations}
                onChange={(event) =>
                  setMainConfig((current) => ({
                    ...current,
                    fractal: {
                      ...current.fractal,
                      maxIterations: Number(event.target.value),
                    },
                  }))
                }
              />
              <strong>{mainConfig.fractal.maxIterations}</strong>
            </label>
            </div>

            <div className="control-panel__section control-panel__actions">
              <button type="button" onClick={resetMainView}>
                Reset view
              </button>
              <button type="button" onClick={() => setShowJuliaPanel((current) => !current)}>
                {showJuliaPanel ? 'Hide Julia panel' : 'Show Julia panel'}
              </button>
            </div>

            <details className="control-panel__section control-panel__collapsible">
            <summary className="control-panel__summary">Current view</summary>
            <div className="control-panel__note">
              <strong>{formulaRegistry[mainConfig.fractal.formulaId].displayName}</strong>
              <span>Drag to pan. Scroll to zoom.</span>
              <span>Click a surface, then use your configured game-style keys to fly through the view.</span>
              {mainConfig.fractal.formulaId === 'mandelbrot' ? (
                <span>Click the main surface to seed the Julia panel.</span>
              ) : mainConfig.fractal.formulaId === 'julia' ? (
                <span>Julia parameters can be tuned directly in the controls.</span>
              ) : (
                <span>Explore this formula directly; Waypoints, Discover, Compare, and Journey work the same.</span>
              )}
            </div>
            </details>

            {showJuliaPanel && juliaSeed ? (
              <details
                className={firstFlightState === 'tuneJulia'
                  ? 'control-panel__section control-panel__collapsible julia-parameter-controls is-first-flight-target'
                  : 'control-panel__section control-panel__collapsible julia-parameter-controls'}
                open={firstFlightState === 'tuneJulia' ? true : undefined}
              >
                <summary className="control-panel__summary">Linked Julia parameters</summary>
                <div className="control-panel__grid">
                  <label>
                    <span>Linked Julia real</span>
                    <input
                      type="number"
                      step="0.0001"
                      value={juliaConfig.fractal.parameters.cReal ?? -0.8}
                      onChange={(event) => updateLinkedJuliaParameter('cReal', Number(event.target.value))}
                    />
                  </label>
                  <label>
                    <span>Linked Julia imaginary</span>
                    <input
                      type="number"
                      step="0.0001"
                      value={juliaConfig.fractal.parameters.cImag ?? 0.156}
                      onChange={(event) => updateLinkedJuliaParameter('cImag', Number(event.target.value))}
                    />
                  </label>
                </div>
                <span className="control-panel__shortcut-hint">Focus either surface, then use J/L for real and I/K for imaginary. Keys move by 0.001; hold Shift for 0.0001 fine steps. Change bindings in Settings.</span>
              </details>
            ) : null}

            </fieldset>
            <WorkspaceModeNav
              activeMode={activeWorkspaceMode}
              onModeChange={setActiveWorkspaceMode}
              highlightMode={firstFlightState === 'saveWaypoint' ? 'waypoints' : undefined}
            />
          </div>

          <div className="control-panel__workspace-scroll">
            <div className="control-panel__workspace-body">
              {workspace === 'perform' ? <PerformPanel base={mainConfig} effective={effectiveConfig} active={previewActive} running={isPlayingAnimation} journey={previewKind === 'journey'} mappings={preview.mappings ?? []} overrides={{ ...overrides, ...midiOverrides }}
                onOverride={(id, value) => { if (previewActive) setOverrides((current) => { const next = { ...current }; if (value === undefined) delete next[id]; else next[id] = value; return next; }); }}
                onMidiZoom={(delta) => { if (previewActive) { const intent = midiCcDeltaToZoom(delta); if (intent) setMidiViewport((current) => applyNavigationFrame(current ?? effectiveConfig.viewport, [intent.action], navigationSettings, intent.deltaSeconds)); } }}
                onMidiPaletteOffset={(value) => { if (previewActive) setMidiOverrides({ 'palette.offset': value }); }}
                onMidiRelease={() => { setMidiViewport(null); setMidiOverrides({}); }}
                onChange={(config) => { if (!previewActive) setMainConfig(config); }} onEdit={() => { setWorkspace('explore'); exploreWorkspaceButtonRef.current?.focus(); }} /> : <fieldset disabled={previewActive && activeWorkspaceMode !== 'journey' && activeWorkspaceMode !== 'waypoints'} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                {renderActiveWorkspacePanel()}
              </fieldset>}
            </div>

          {rendererDiagnostics && rendererDiagnostics.code !== 'ok' ? (
            <div className="control-panel__section control-panel__note control-panel__note--warning">
              <p>{rendererDiagnostics.fallbackActive ? 'Fallback renderer' : 'Startup diagnostics'}</p>
              <strong>{rendererDiagnostics.summary}</strong>
              <span>Open Settings for the full diagnostic breakdown and fallback guidance.</span>
            </div>
          ) : null}

          {deepZoomDiagnostics.severity !== 'ok' ? (
            <div className={deepZoomDiagnostics.severity === 'warning'
              ? 'control-panel__section control-panel__note control-panel__note--warning'
              : 'control-panel__section control-panel__note'}>
              <p>Deep zoom</p>
              <strong>{deepZoomDiagnostics.summary}</strong>
              <span>
                Zoom depth {deepZoomDiagnostics.zoomDepth.toFixed(2)} · recommended iterations {deepZoomDiagnostics.recommendedIterations}
              </span>
            </div>
          ) : null}

          {juliaSeed ? (
            <div className="control-panel__section control-panel__note">
              <p>Latest Julia seed</p>
              <strong>
                {formatCoordinate(toNumber(juliaSeed.re))} + {formatCoordinate(toNumber(juliaSeed.im))}i
              </strong>
            </div>
          ) : null}
          </div>
        </aside>

        {showComparison ? <div style={workspace === 'perform' || previewActive ? { display: 'none' } : { display: 'contents' }}>
          <ComparisonStage
            comparison={comparisonConfig}
            interactionEnabled={workspace === 'explore' && !previewActive}
            navigationSettings={navigationSettings}
            onLeftConfigChange={(config) => handleComparisonSideConfigChange('left', config)}
            onRightConfigChange={(config) => handleComparisonSideConfigChange('right', config)}
            onDiagnosticsChange={setRendererDiagnostics}
            onResetSide={handleResetComparisonSide}
          />
        </div> : null}
          <section style={showComparison && workspace === 'explore' && !previewActive ? { display: 'none' } : undefined} className={showJuliaPanel && workspace === 'explore' ? 'view-grid view-grid--dual' : 'view-grid'}>
            <RenderView
              viewId="main"
              title={workspace === 'perform' ? 'Primary · Perform' : 'Explore'}
              subtitle={workspace === 'perform' ? 'Primary only · edit the world in Explore' : mainConfig.fractal.formulaId === 'mandelbrot' ? 'Click to reveal a linked Julia view' : 'Primary render surface'}
              config={effectiveConfig}
              interactionEnabled={!previewActive && workspace === 'explore' && !showComparison}
              interactionDisabledLabel={previewActive ? 'Preview layer' : 'Camera editing in Explore'}
              presentationAspectRatio
              onConfigChange={handlePrimarySurfaceChange}
              onPointSelect={mainConfig.fractal.formulaId === 'mandelbrot' ? handleJuliaSeedSelect : undefined}
              onDiagnosticsChange={setRendererDiagnostics}
              navigationSettings={navigationSettings}
              onRequestReset={resetMainView}
              onCanvasReady={(canvas) => {
                mainCanvasRef.current = canvas;
              }}
              onNavigationActionEvent={handleNavigationActionEvent}
              onDiscreteNavigationAction={handleMainDiscreteNavigationAction}
              onUserNavigate={() => completeFirstFlightAction('navigate')}
              highlightForTutorial={firstFlightState === 'navigate' || firstFlightState === 'linkJulia'}
            />

            {showJuliaPanel && workspace === 'explore' ? (
              <RenderView
                viewId="julia"
                title="Julia"
                subtitle={juliaPanelPresentation.subtitle}
                config={juliaConfig}
                onConfigChange={setJuliaConfig}
                onDiagnosticsChange={setRendererDiagnostics}
                navigationSettings={navigationSettings}
                interactionEnabled={juliaPanelPresentation.interactionEnabled}
                renderingEnabled={juliaPanelPresentation.renderingEnabled}
                placeholder={juliaPanelPresentation.placeholder}
                onRequestReset={() =>
                  setJuliaConfig((current) => ({
                    ...current,
                    viewport: resetJuliaViewport(current.viewport.aspectRatio),
                  }))
                }
                onDiscreteNavigationAction={handleLinkedJuliaNavigationAction}
              />
            ) : null}
          </section>
      </section>

      <SettingsPortal
        open={showSettingsPortal}
        navigationSettings={navigationSettings}
        pixelDensity={mainConfig.quality.pixelDensity}
        qualityLocked={previewActive}
        rebindingAction={rebindingAction}
        rendererDiagnostics={rendererDiagnostics}
        deepZoomDiagnostics={deepZoomDiagnostics}
        onClose={() => setShowSettingsPortal(false)}
        onResetNavigationSettings={resetNavigationSettings}
        onStartRebinding={setRebindingAction}
        onPixelDensityChange={(value) =>
          setMainConfig((current) => ({
            ...current,
            quality: {
              ...current.quality,
              pixelDensity: value,
            },
          }))
        }
        onNavigationSettingsChange={(updater) => setNavigationSettings((current) => updater(current))}
        highlightControls={firstFlightState === 'reviewControls'}
      />
    </main>
  );
}

function formatCoordinate(value: number): string {
  if (Math.abs(value) < 0.001 || Math.abs(value) > 1_000) {
    return value.toExponential(3);
  }

  return value.toFixed(6);
}


function sanitizeFilename(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || 'fractal-journey';
}
