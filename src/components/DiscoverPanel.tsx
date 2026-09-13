import type { DiscoveryOptions } from '../navigation/discovery';
import { summarizeDiscoveryWorkspace } from '../navigation/discoveryWorkspace';
import type { Waypoint } from '../types/config';

interface DiscoverPanelProps {
  options: DiscoveryOptions;
  discoveryResults: Waypoint[];
  scannedTiles: number;
  status: string | null;
  onOptionsChange: (updater: (current: DiscoveryOptions) => DiscoveryOptions) => void;
  onRunDiscovery: () => void;
  onLoadWaypoint: (waypoint: Waypoint) => void;
}

export function DiscoverPanel({
  options,
  discoveryResults,
  scannedTiles,
  status,
  onOptionsChange,
  onRunDiscovery,
  onLoadWaypoint,
}: DiscoverPanelProps) {
  const summary = summarizeDiscoveryWorkspace(options, discoveryResults);

  return (
    <details className="control-panel__section control-panel__collapsible" open>
      <summary className="control-panel__summary">Discover</summary>

      <div className="discover-panel">
        <div className="discover-panel__overview">
          <div className="control-panel__note">
            <p>Heuristic scan</p>
            <strong>{status ?? 'Ready to scan the current view'}</strong>
            <span>
              {summary.intensityLabel} · about {summary.estimatedTileCount} candidate tiles
            </span>
            <span>Discovery scores formula geometry only, so a different material never changes what it finds.</span>
          </div>

          <div className="discover-panel__stats">
            <div className="discover-panel__stat-card">
              <span>Results</span>
              <strong>{discoveryResults.length}</strong>
            </div>
            <div className="discover-panel__stat-card">
              <span>Best score</span>
              <strong>{summary.topScoreLabel}</strong>
            </div>
          </div>
        </div>

        <div className="discover-panel__workflow-card">
          <div className="control-panel__section-heading">
            <div>
              <p className="control-panel__label">Scan profile</p>
              <strong>Shape how broad and deep the search should go</strong>
            </div>
          </div>

          <div className="control-panel__grid">
            <label>
              <span>Levels</span>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={options.levels}
                onChange={(event) =>
                  onOptionsChange((current) => ({
                    ...current,
                    levels: Number(event.target.value),
                  }))
                }
              />
              <strong>{options.levels}</strong>
            </label>
            <label>
              <span>Beam width</span>
              <input
                type="range"
                min="2"
                max="8"
                step="1"
                value={options.beamWidth}
                onChange={(event) =>
                  onOptionsChange((current) => ({
                    ...current,
                    beamWidth: Number(event.target.value),
                  }))
                }
              />
              <strong>{options.beamWidth}</strong>
            </label>
            <label>
              <span>Samples</span>
              <input
                type="range"
                min="4"
                max="10"
                step="1"
                value={options.samplesPerAxis}
                onChange={(event) =>
                  onOptionsChange((current) => ({
                    ...current,
                    samplesPerAxis: Number(event.target.value),
                  }))
                }
              />
              <strong>{options.samplesPerAxis}x{options.samplesPerAxis}</strong>
            </label>
            <label>
              <span>Results</span>
              <input
                type="range"
                min="1"
                max="12"
                step="1"
                value={options.maxResults}
                onChange={(event) =>
                  onOptionsChange((current) => ({
                    ...current,
                    maxResults: Number(event.target.value),
                  }))
                }
              />
              <strong>{options.maxResults}</strong>
            </label>
          </div>
        </div>

        <div className="discover-panel__actions">
          <button type="button" onClick={onRunDiscovery}>
            Scan current view
          </button>
          <div className="discover-panel__summary">
            <span>{discoveryResults.length} results</span>
            <span>{scannedTiles} tiles sampled</span>
          </div>
        </div>

        {discoveryResults.length > 0 ? (
          <div className="discover-panel__list">
            {discoveryResults.map((waypoint, index) => (
              <article key={waypoint.id} className="discover-card">
                <div className="discover-card__copy">
                  <div className="discover-card__header">
                    <strong>{waypoint.name}</strong>
                    <span className="discover-card__rank">#{index + 1}</span>
                  </div>
                  {waypoint.description ? <span>{waypoint.description}</span> : null}
                  <div className="waypoint-card__meta">
                    <span>Score {(waypoint.interestingnessScore ?? 0).toFixed(2)}</span>
                    <span>{waypoint.renderConfig.fractal.formulaId}</span>
                    {waypoint.tags.slice(0, 2).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={() => onLoadWaypoint(waypoint)}>
                  Load
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="control-panel__note">
            <strong>No discovery results yet</strong>
            <span>Run a scan to surface candidate regions from the current view.</span>
          </div>
        )}
      </div>
    </details>
  );
}
