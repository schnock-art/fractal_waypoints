import { summarizeJourneyWorkspace } from '../animation/workspace';
import type { AnimationClip, NavigationSettings, RecordedNavigationEvent, RenderConfig, Waypoint } from '../types/config';
import { hasRecordedNavigation } from '../animation/model';

interface AnimationPanelProps {
  clip: AnimationClip;
  activeConfig: RenderConfig;
  waypoints: Waypoint[];
  recordedEvents: RecordedNavigationEvent[];
  isPlaying: boolean;
  isRecordingNavigation: boolean;
  playbackStatus: string | null;
  selectedStartWaypointId: string;
  selectedEndWaypointId: string;
  onClipChange: (updater: (current: AnimationClip) => AnimationClip) => void;
  onAddCurrentKeyframe: () => void;
  onCaptureCurrentToKeyframe: (keyframeId: string) => void;
  onRemoveKeyframe: (keyframeId: string) => void;
  onLoadKeyframe: (keyframeId: string) => void;
  onStartPlayback: () => void;
  onStopPlayback: () => void;
  onStartRecordingNavigation: () => void;
  onStopRecordingNavigation: () => void;
  onBuildJourneyFromWaypoints: () => void;
  onBuildJourneyFromRecording: () => void;
  onSetSelectedStartWaypointId: (value: string) => void;
  onSetSelectedEndWaypointId: (value: string) => void;
  onExportImageSequence: () => void;
  onExportWebm: () => void;
  navigationSettings: NavigationSettings;
}

export function AnimationPanel({
  clip,
  waypoints,
  recordedEvents,
  isPlaying,
  isRecordingNavigation,
  playbackStatus,
  selectedStartWaypointId,
  selectedEndWaypointId,
  onClipChange,
  onAddCurrentKeyframe,
  onCaptureCurrentToKeyframe,
  onRemoveKeyframe,
  onLoadKeyframe,
  onStartPlayback,
  onStopPlayback,
  onStartRecordingNavigation,
  onStopRecordingNavigation,
  onBuildJourneyFromWaypoints,
  onBuildJourneyFromRecording,
  onSetSelectedStartWaypointId,
  onSetSelectedEndWaypointId,
  onExportImageSequence,
  onExportWebm,
}: AnimationPanelProps) {
  const summary = summarizeJourneyWorkspace(clip, Math.round((clip.durationMs / 1000) * clip.fps) + 1, recordedEvents);

  return (
    <section className="animation-panel tool-panel" aria-label="Journey controls">
        <div className="animation-panel__overview">
          <div className="control-panel__note">
            <p>Animation clip</p>
            <strong>{playbackStatus ?? clip.name}</strong>
            <span>{summary.keyframeCount} keyframes · {summary.durationSeconds}s · {clip.fps} FPS</span>
            <span>Keyframe-driven journeys stay configuration-based for preview and export.</span>
          </div>

          <div className="animation-panel__stats">
            <div className="animation-panel__stat-card">
              <span>Frames</span>
              <strong>{summary.exportFrameCount}</strong>
            </div>
            <div className="animation-panel__stat-card">
              <span>Recording</span>
              <strong>{summary.recordingSummary}</strong>
            </div>
          </div>
        </div>

        <label>
          <span>Name</span>
          <input
            value={clip.name}
            onChange={(event) =>
              onClipChange((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
          />
        </label>

        <div className="control-panel__grid">
          <label>
            <span>Duration</span>
            <input
              type="range"
              min="1000"
              max="12000"
              step="250"
              value={clip.durationMs}
              onChange={(event) =>
                onClipChange((current) => ({
                  ...current,
                  durationMs: Number(event.target.value),
                }))
              }
            />
            <strong>{(clip.durationMs / 1000).toFixed(2)}s</strong>
          </label>
          <label>
            <span>FPS</span>
            <input
              type="range"
              min="12"
              max="60"
              step="6"
              value={clip.fps}
              onChange={(event) =>
                onClipChange((current) => ({
                  ...current,
                  fps: Number(event.target.value),
                }))
              }
            />
            <strong>{clip.fps}</strong>
          </label>
          <label>
            <span>Easing</span>
            <select
              value={clip.easing}
              onChange={(event) =>
                onClipChange((current) => ({
                  ...current,
                  easing: event.target.value as AnimationClip['easing'],
                }))
              }
            >
              <option value="linear">Linear</option>
              <option value="easeInOut">Ease in/out</option>
            </select>
          </label>
        </div>

        <div className="animation-panel__actions">
          <button type="button" onClick={isPlaying ? onStopPlayback : onStartPlayback}>
            {isPlaying ? 'Stop playback' : 'Play journey'}
          </button>
          <button type="button" onClick={onAddCurrentKeyframe}>
            Add current view
          </button>
        </div>

        <div className="animation-panel__workflow-grid">
          <section className="animation-panel__journey-builder animation-panel__workflow-card">
            <div className="control-panel__section-heading">
              <div>
                <p className="control-panel__label">Waypoint journey</p>
                <strong>Build a portal-to-portal move</strong>
              </div>
            </div>
            <label>
              <span>Start waypoint</span>
              <select value={selectedStartWaypointId} onChange={(event) => onSetSelectedStartWaypointId(event.target.value)}>
                {waypoints.map((waypoint) => (
                  <option key={waypoint.id} value={waypoint.id}>
                    {waypoint.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>End waypoint</span>
              <select value={selectedEndWaypointId} onChange={(event) => onSetSelectedEndWaypointId(event.target.value)}>
                {waypoints.map((waypoint) => (
                  <option key={waypoint.id} value={waypoint.id}>
                    {waypoint.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={onBuildJourneyFromWaypoints} disabled={waypoints.length < 2}>
              Build from waypoints
            </button>
          </section>

          <section className="animation-panel__recording animation-panel__workflow-card">
            <div className="control-panel__section-heading">
              <div>
                <p className="control-panel__label">Navigation capture</p>
                <strong>Turn live motion into a draft journey</strong>
              </div>
            </div>
            <div className="animation-panel__actions">
              <button type="button" onClick={isRecordingNavigation ? onStopRecordingNavigation : onStartRecordingNavigation}>
                {isRecordingNavigation ? 'Stop navigation capture' : 'Record navigation'}
              </button>
              <button type="button" onClick={onBuildJourneyFromRecording} disabled={!hasRecordedNavigation(recordedEvents)}>
                Convert recording
              </button>
            </div>
            <span>{recordedEvents.length} semantic navigation events captured.</span>
          </section>
        </div>

        <div className="animation-panel__keyframes">
          <div className="control-panel__section-heading">
            <div>
              <p className="control-panel__label">Keyframes</p>
              <strong>Shape the final path</strong>
            </div>
          </div>
          {clip.keyframes.map((keyframe) => (
            <article key={keyframe.id} className="animation-keyframe">
              <label>
                <span>Label</span>
                <input
                  value={keyframe.label}
                  onChange={(event) =>
                    onClipChange((current) => ({
                      ...current,
                      keyframes: current.keyframes.map((entry) => entry.id === keyframe.id
                        ? { ...entry, label: event.target.value }
                        : entry),
                    }))
                  }
                />
              </label>
              <label>
                <span>Time</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={keyframe.time}
                  onChange={(event) =>
                    onClipChange((current) => ({
                      ...current,
                      keyframes: [...current.keyframes]
                        .map((entry) => entry.id === keyframe.id
                          ? { ...entry, time: Number(event.target.value) }
                          : entry)
                        .sort((left, right) => left.time - right.time),
                    }))
                  }
                />
                <strong>{Math.round(keyframe.time * 100)}%</strong>
              </label>
              <div className="animation-panel__actions">
                <button type="button" onClick={() => onLoadKeyframe(keyframe.id)}>
                  Load
                </button>
                <button type="button" onClick={() => onCaptureCurrentToKeyframe(keyframe.id)}>
                  Capture current
                </button>
                <button type="button" onClick={() => onRemoveKeyframe(keyframe.id)} disabled={clip.keyframes.length <= 2}>
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="animation-panel__actions">
          <button type="button" onClick={onExportImageSequence}>
            Export image sequence
          </button>
          <button type="button" onClick={onExportWebm}>
            Export WebM
          </button>
        </div>
    </section>
  );
}
