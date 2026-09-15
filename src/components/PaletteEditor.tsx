import { useEffect, useMemo, useState } from 'react';

import { downloadPalettePng } from '../palettes/export';
import { paletteOffsetParameter, setPaletteOffset } from '../palettes/offset';
import {
  addPaletteStop,
  cyclePaletteRepeatMode,
  hexToRgba,
  paletteToCssGradient,
  removePaletteStop,
  reversePalette,
  rgbaToHex,
  updatePaletteStopColor,
  updatePaletteStopPosition,
  validatePalette,
} from '../palettes/model';
import { palettePresets } from '../palettes/presets';
import { duplicatePaletteStop, nudgePaletteStop, summarizePaletteWorkspace } from '../palettes/workspace';
import type { PaletteConfig } from '../types/config';

interface PaletteEditorProps {
  palette: PaletteConfig;
  onChange: (palette: PaletteConfig) => void;
}

export function PaletteEditor({ palette, onChange }: PaletteEditorProps) {
  const [selectedStopIndex, setSelectedStopIndex] = useState(0);
  const issues = useMemo(() => validatePalette(palette), [palette]);
  const gradient = useMemo(() => paletteToCssGradient(palette), [palette]);
  const selectedStop = palette.stops[Math.min(selectedStopIndex, palette.stops.length - 1)] ?? palette.stops[0];
  const summary = useMemo(() => summarizePaletteWorkspace(palette, palettePresets), [palette]);

  useEffect(() => {
    setSelectedStopIndex((current) => Math.min(current, Math.max(0, palette.stops.length - 1)));
  }, [palette.stops.length]);

  function handlePresetChange(presetId: string) {
    const preset = palettePresets.find((entry) => entry.id === presetId);
    if (!preset) {
      return;
    }

    onChange({
      ...preset.palette,
      offset: palette.offset,
      scale: palette.scale,
    });
  }

  function updateStopColor(index: number, hex: string) {
    onChange(updatePaletteStopColor(palette, index, hexToRgba(hex)));
  }

  function updateStopPosition(index: number, position: number) {
    onChange(updatePaletteStopPosition(palette, index, position));
  }

  function handlePreviewClick(event: React.MouseEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = Math.min(1, Math.max(0, (event.clientX - bounds.left) / Math.max(bounds.width, 1)));
    const next = addPaletteStop(palette, position);
    const index = next.stops.findIndex((stop) => Math.abs(stop.position - position) < 0.011);
    onChange(next);
    if (index >= 0) {
      setSelectedStopIndex(index);
    }
  }

  function handleSelectedStopHexChange(hex: string) {
    if (!selectedStop) {
      return;
    }

    const normalized = normalizeHexInput(hex);
    if (!normalized) {
      return;
    }

    updateStopColor(selectedStopIndex, normalized);
  }

  function handleSelectedChannelChange(channel: 'r' | 'g' | 'b', value: number) {
    if (!selectedStop) {
      return;
    }

    const nextColor = {
      ...selectedStop.color,
      [channel]: clampChannel(value) / 255,
    };

    onChange(updatePaletteStopColor(palette, selectedStopIndex, nextColor));
  }

  return (
    <details className="control-panel__section control-panel__collapsible" open>
      <summary className="control-panel__summary">Palette</summary>

      <div className="palette-editor">
        <div className="palette-editor__overview">
          <div className="control-panel__note">
            <p>Active palette</p>
            <strong>{summary.matchedPresetName}</strong>
            <span>
              {summary.stopCount} stops · {palette.interpolation} interpolation · {palette.repeatMode} repeat
            </span>
            <span>
              {summary.isCustom ? 'Custom variation tuned in the workspace.' : 'Preset structure still intact.'}
            </span>
          </div>

          <div className="palette-editor__preset-grid">
            {palettePresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={preset.id === summary.matchedPresetId ? 'palette-editor__preset-card is-active' : 'palette-editor__preset-card'}
                onClick={() => handlePresetChange(preset.id)}
              >
                <span
                  className="palette-editor__preset-preview"
                  style={{ backgroundImage: paletteToCssGradient(preset.palette) }}
                />
                <strong>{preset.name}</strong>
                <span>{preset.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="palette-editor__preview-shell">
          <div
            className="palette-editor__preview"
            style={{ backgroundImage: gradient }}
            onClick={handlePreviewClick}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handlePreviewClick(event as unknown as React.MouseEvent<HTMLDivElement>);
              }
            }}
            aria-label="Palette gradient preview. Click to add a stop."
          />
          <div className="palette-editor__stop-track">
            {palette.stops.map((stop, index) => (
              <button
                key={`${stop.position}-${index}`}
                type="button"
                className={index === selectedStopIndex ? 'palette-editor__stop-dot is-selected' : 'palette-editor__stop-dot'}
                style={{
                  left: `${stop.position * 100}%`,
                  backgroundColor: rgbaToHex(stop.color),
                }}
                onClick={() => setSelectedStopIndex(index)}
                aria-label={`Palette stop ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="palette-editor__selected-stop">
          <div className="palette-editor__selected-header">
            <div>
              <p className="control-panel__label">Selected stop</p>
              <strong>Stop {selectedStopIndex + 1} · {Math.round((selectedStop?.position ?? 0) * 100)}%</strong>
            </div>
            <div className="palette-editor__selected-actions">
              <button
                type="button"
                onClick={() => {
                  const next = duplicatePaletteStop(palette, selectedStopIndex);
                  const nextIndex = next.stops.findIndex((stop) => Math.abs(stop.position - Math.min(1, (selectedStop?.position ?? 0.5) + 0.08)) < 0.011);
                  onChange(next);
                  if (nextIndex >= 0) {
                    setSelectedStopIndex(nextIndex);
                  }
                }}
              >
                Duplicate
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = removePaletteStop(palette, selectedStopIndex);
                  const nextIndex = Math.min(selectedStopIndex, Math.max(0, next.stops.length - 1));
                  onChange(next);
                  setSelectedStopIndex(nextIndex);
                }}
                disabled={palette.stops.length <= 2}
              >
                Remove
              </button>
            </div>
          </div>

          {selectedStop ? (
            <>
              <div className="palette-editor__selected-color-row">
                <div
                  className="palette-editor__selected-swatch"
                  style={{ backgroundColor: rgbaToHex(selectedStop.color) }}
                />
                <label>
                  <span>Pick colour</span>
                  <input
                    type="color"
                    value={rgbaToHex(selectedStop.color)}
                    onChange={(event) => updateStopColor(selectedStopIndex, event.target.value)}
                  />
                </label>
                <label>
                  <span>Hex</span>
                  <input
                    type="text"
                    value={rgbaToHex(selectedStop.color)}
                    onChange={(event) => handleSelectedStopHexChange(event.target.value)}
                  />
                </label>
              </div>

              <div className="palette-editor__selected-grid">
                <label>
                  <span>Position</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedStop.position}
                    onChange={(event) => updateStopPosition(selectedStopIndex, Number(event.target.value))}
                  />
                  <strong>{selectedStop.position.toFixed(2)}</strong>
                </label>
                <div className="palette-editor__nudge-row">
                  <button type="button" onClick={() => onChange(nudgePaletteStop(palette, selectedStopIndex, -0.05))}>
                    Nudge left
                  </button>
                  <button type="button" onClick={() => onChange(nudgePaletteStop(palette, selectedStopIndex, 0.05))}>
                    Nudge right
                  </button>
                </div>
                <label>
                  <span>Red</span>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    step="1"
                    value={Math.round(selectedStop.color.r * 255)}
                    onChange={(event) => handleSelectedChannelChange('r', Number(event.target.value))}
                  />
                  <strong>{Math.round(selectedStop.color.r * 255)}</strong>
                </label>
                <label>
                  <span>Green</span>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    step="1"
                    value={Math.round(selectedStop.color.g * 255)}
                    onChange={(event) => handleSelectedChannelChange('g', Number(event.target.value))}
                  />
                  <strong>{Math.round(selectedStop.color.g * 255)}</strong>
                </label>
                <label>
                  <span>Blue</span>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    step="1"
                    value={Math.round(selectedStop.color.b * 255)}
                    onChange={(event) => handleSelectedChannelChange('b', Number(event.target.value))}
                  />
                  <strong>{Math.round(selectedStop.color.b * 255)}</strong>
                </label>
              </div>
            </>
          ) : null}
        </div>

        <div className="palette-editor__stop-strip">
          {palette.stops.map((stop, index) => (
            <button
              key={`swatch-${stop.position}-${index}`}
              type="button"
              className={index === selectedStopIndex ? 'palette-editor__stop-chip is-selected' : 'palette-editor__stop-chip'}
              onClick={() => setSelectedStopIndex(index)}
            >
              <span
                className="palette-editor__stop-chip-swatch"
                style={{ backgroundColor: rgbaToHex(stop.color) }}
              />
              <strong>{index + 1}</strong>
              <span>{stop.position.toFixed(2)}</span>
            </button>
          ))}
        </div>

        <div className="control-panel__grid">
          <label>
            <span>Interpolation</span>
            <select
              value={palette.interpolation}
              onChange={(event) =>
                onChange({
                  ...palette,
                  interpolation: event.target.value as PaletteConfig['interpolation'],
                })
              }
            >
              <option value="linear">Linear</option>
              <option value="smooth">Smooth</option>
              <option value="cubic">Cubic</option>
            </select>
          </label>
        </div>

        <div className="control-panel__grid">
          <label>
            <span>Offset</span>
            <input
              type="range"
              min={paletteOffsetParameter.display.min}
              max={paletteOffsetParameter.display.max}
              step={paletteOffsetParameter.display.step}
              value={palette.offset}
              onChange={(event) =>
                onChange(setPaletteOffset(palette, Number(event.target.value)))
              }
            />
            <strong>{palette.offset.toFixed(2)}</strong>
          </label>
          <label>
            <span>Scale</span>
            <input
              type="range"
              min="0.2"
              max="3"
              step="0.05"
              value={palette.scale}
              onChange={(event) =>
                onChange({
                  ...palette,
                  scale: Number(event.target.value),
                })
              }
            />
            <strong>{palette.scale.toFixed(2)}</strong>
          </label>
        </div>

        <div className="palette-editor__actions">
          <button
            type="button"
            onClick={() => {
              const anchor = selectedStop?.position ?? 0.5;
              const nextPosition = Math.min(1, anchor + 0.08);
              const next = addPaletteStop(palette, nextPosition);
              const index = next.stops.findIndex((stop) => Math.abs(stop.position - nextPosition) < 0.011);
              onChange(next);
              if (index >= 0) {
                setSelectedStopIndex(index);
              }
            }}
          >
            Add near selected
          </button>
          <button type="button" onClick={() => onChange(reversePalette(palette))}>
            Reverse
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...palette,
                repeatMode: cyclePaletteRepeatMode(palette.repeatMode),
              })
            }
          >
            Repeat: {palette.repeatMode}
          </button>
          <button type="button" onClick={() => downloadPalettePng(palette, `palette-${Date.now()}.png`)}>
            Export PNG
          </button>
        </div>

        {issues.length > 0 ? (
          <div className="control-panel__note control-panel__note--warning">
            <p>Palette issues</p>
            {issues.map((issue) => (
              <span key={issue.message}>{issue.message}</span>
            ))}
          </div>
        ) : null}
      </div>
    </details>
  );
}

function clampChannel(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function normalizeHexInput(value: string): string | null {
  const cleaned = value.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{3,6}$/.test(cleaned)) {
    return null;
  }

  return `#${cleaned.length === 3 ? cleaned.split('').map((char) => char + char).join('') : cleaned.slice(0, 6)}`;
}
