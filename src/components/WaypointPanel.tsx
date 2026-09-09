import { useEffect, useMemo, useState } from 'react';

import { formulaRegistry } from '../fractals/registry';
import { buildQuickWaypointName, getWaypointSourceLabel, groupWaypointsForWorkspace, type WaypointSourceFilter } from '../navigation/waypointWorkspace';
import { scoreRenderInterestingness, updateWaypoint } from '../navigation/waypoints';
import { renderWaypointThumbnail } from '../navigation/thumbnails';
import type { RenderConfig, Waypoint } from '../types/config';

interface WaypointPanelProps {
  activeConfig: RenderConfig;
  waypoints: Waypoint[];
  onSaveWaypoint: (draft: { name: string; description: string }) => void;
  onLoadWaypoint: (waypoint: Waypoint) => void;
  onDeleteWaypoint: (waypointId: string) => void;
  onClearDiscoveredWaypoints: () => void;
  onRefreshWaypointFromCurrent: (waypointId: string) => void;
  onPromoteWaypoint: (waypoint: Waypoint) => void;
  onUpdateWaypoint: (waypoint: Waypoint) => void;
  onCopyShareLink: () => void;
  highlightSaveAction?: boolean;
}

export function WaypointPanel({
  activeConfig,
  waypoints,
  onSaveWaypoint,
  onLoadWaypoint,
  onDeleteWaypoint,
  onClearDiscoveredWaypoints,
  onRefreshWaypointFromCurrent,
  onPromoteWaypoint,
  onUpdateWaypoint,
  onCopyShareLink,
  highlightSaveAction = false,
}: WaypointPanelProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<WaypointSourceFilter>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');

  const activeFormulaLabel = formulaRegistry[activeConfig.fractal.formulaId]?.displayName ?? activeConfig.fractal.formulaId;
  const activeScore = useMemo(() => scoreRenderInterestingness(activeConfig), [activeConfig]);
  const groupedSections = useMemo(
    () => groupWaypointsForWorkspace(waypoints, sourceFilter, searchTerm),
    [searchTerm, sourceFilter, waypoints],
  );
  const discoveredCount = useMemo(
    () => waypoints.filter((waypoint) => waypoint.source === 'discovered').length,
    [waypoints],
  );
  const quickSaveName = useMemo(
    () => buildQuickWaypointName(activeConfig, waypoints.length),
    [activeConfig, waypoints.length],
  );

  function handleSaveCurrentWaypoint() {
    onSaveWaypoint({ name, description });
    setName('');
    setDescription('');
  }

  function handleQuickSaveWaypoint() {
    onSaveWaypoint({
      name: quickSaveName,
      description: `${activeFormulaLabel} capture saved from Explore.`,
    });
  }

  return (
    <details className="control-panel__section control-panel__collapsible" open>
      <summary className="control-panel__summary">Waypoints</summary>

      <div className="waypoint-panel">
        <div className="control-panel__note">
          <p>Current capture</p>
          <strong>{activeFormulaLabel} / score {activeScore.toFixed(2)}</strong>
          <span>Save the current view, refresh an existing saved portal, or share the exact state through the URL.</span>
        </div>

        <div className="waypoint-panel__capture-card">
          <div className="waypoint-panel__capture-header">
            <div>
              <p className="control-panel__label">Capture</p>
              <strong>{quickSaveName}</strong>
            </div>
            <div className="waypoint-panel__actions">
              <button type="button" className={highlightSaveAction ? 'is-first-flight-target' : undefined} onClick={handleQuickSaveWaypoint}>
                Quick save
              </button>
              <button type="button" onClick={onCopyShareLink}>
                Copy share link
              </button>
            </div>
          </div>

          <div className="waypoint-panel__save-form">
            <label>
              <span>Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Crystal inlet" />
            </label>
            <label>
              <span>Description</span>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Why this region is interesting"
              />
            </label>
          </div>
          <div className="waypoint-panel__actions">
            <button type="button" onClick={handleSaveCurrentWaypoint}>
              Save Waypoint
            </button>
            <button type="button" onClick={() => {
              setName(quickSaveName);
              setDescription(`${activeFormulaLabel} capture saved from Explore.`);
            }}>
              Prefill draft
            </button>
          </div>
        </div>

        <div className="waypoint-panel__toolbar">
          <label>
            <span>Search</span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Find waypoints, tags, formulas..."
            />
          </label>
          <label>
            <span>Show</span>
            <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as WaypointSourceFilter)}>
              <option value="all">All sources</option>
              <option value="user">Saved only</option>
              <option value="discovered">Discovered only</option>
              <option value="curated">Curated only</option>
            </select>
          </label>
        </div>

        {discoveredCount > 0 ? (
          <div className="waypoint-panel__bulk-actions">
            <span>{discoveredCount} discovered Waypoints are active in this workspace.</span>
            <button type="button" onClick={onClearDiscoveredWaypoints}>
              Clear discovered
            </button>
          </div>
        ) : null}

        <div className="waypoint-panel__groups">
          {groupedSections.map((section) => (
            <details
              key={section.source}
              className="waypoint-panel__group control-panel__collapsible"
              open={section.source !== 'curated' || section.count === 0}
            >
              <summary className="control-panel__summary">
                {section.label} <span className="waypoint-panel__group-count">{section.count}</span>
              </summary>

              {section.count === 0 ? (
                <div className="control-panel__note">
                  <strong>No {section.label.toLowerCase()} Waypoints yet</strong>
                  <span>
                    {section.source === 'user'
                      ? 'Save the current view to build your own portal library.'
                      : section.source === 'discovered'
                        ? 'Run Discover to generate candidate regions from the current view.'
                        : 'Curated starter portals will appear here.'}
                  </span>
                </div>
              ) : (
                <div className="waypoint-panel__list">
                  {section.waypoints.map((waypoint) => {
                    const isEditing = editingId === waypoint.id;

                    return (
                      <article key={waypoint.id} className="waypoint-card">
                        <WaypointThumbnail
                          waypoint={waypoint}
                          onLoad={() => onLoadWaypoint(waypoint)}
                          onGenerated={(thumbnailDataUrl) => onUpdateWaypoint(updateWaypoint(waypoint, { thumbnailDataUrl }))}
                        />
                        <div className="waypoint-card__content">
                          {isEditing ? (
                            <>
                              <input value={editingName} onChange={(event) => setEditingName(event.target.value)} />
                              <input value={editingDescription} onChange={(event) => setEditingDescription(event.target.value)} />
                            </>
                          ) : (
                            <>
                              <strong>{waypoint.name}</strong>
                              {waypoint.description ? <span>{waypoint.description}</span> : null}
                            </>
                          )}
                          <div className="waypoint-card__meta">
                            <span>{getWaypointSourceLabel(waypoint.source)}</span>
                            <span>{waypoint.renderConfig.fractal.formulaId}</span>
                            <span>Score {(waypoint.interestingnessScore ?? 0).toFixed(2)}</span>
                          </div>
                          <div className="waypoint-card__actions">
                            {isEditing ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateWaypoint(updateWaypoint(waypoint, {
                                    name: editingName,
                                    description: editingDescription,
                                  }));
                                  setEditingId(null);
                                }}
                              >
                                Save edit
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(waypoint.id);
                                  setEditingName(waypoint.name);
                                  setEditingDescription(waypoint.description ?? '');
                                }}
                              >
                                Edit
                              </button>
                            )}
                            <button type="button" onClick={() => onLoadWaypoint(waypoint)}>
                              Load
                            </button>
                            {waypoint.source === 'user' ? (
                              <>
                                <button type="button" onClick={() => onRefreshWaypointFromCurrent(waypoint.id)}>
                                  Refresh
                                </button>
                                <button type="button" onClick={() => onDeleteWaypoint(waypoint.id)}>
                                  Delete
                                </button>
                              </>
                            ) : (
                              <button type="button" onClick={() => onPromoteWaypoint(waypoint)}>
                                Keep
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </details>
          ))}
        </div>
      </div>
    </details>
  );
}

interface WaypointThumbnailProps {
  waypoint: Waypoint;
  onLoad: () => void;
  onGenerated: (thumbnailDataUrl: string) => void;
}

function WaypointThumbnail({ waypoint, onLoad, onGenerated }: WaypointThumbnailProps) {
  const [generationAttempted, setGenerationAttempted] = useState(false);

  useEffect(() => {
    if (waypoint.thumbnailDataUrl || generationAttempted) {
      return;
    }

    let cancelled = false;
    setGenerationAttempted(true);

    void renderWaypointThumbnail(waypoint.renderConfig).then((thumbnailDataUrl) => {
      if (!cancelled && thumbnailDataUrl) {
        onGenerated(thumbnailDataUrl);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [generationAttempted, onGenerated, waypoint.renderConfig, waypoint.thumbnailDataUrl]);

  return (
    <button
      type="button"
      className="waypoint-card__thumbnail"
      onClick={onLoad}
      style={waypoint.thumbnailDataUrl ? { backgroundImage: `url(${waypoint.thumbnailDataUrl})` } : undefined}
    >
      {!waypoint.thumbnailDataUrl ? <span>{generationAttempted ? 'rendering' : waypoint.renderConfig.fractal.formulaId}</span> : null}
    </button>
  );
}
