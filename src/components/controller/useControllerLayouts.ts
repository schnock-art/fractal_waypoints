import { useState, type ChangeEvent } from 'react';
import { createControllerLayoutsDocument, downloadControllerLayouts, importControllerLayouts, loadControllerLayouts, saveControllerLayouts,
  type ControllerLayout, type ControllerLayoutLane, type ControllerLayoutsDocument } from '../../connections/controllerLayout';
import type { ControlAddress } from '../../connections/externalControl';

const nextId = (prefix: string) => `${prefix}-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

export function useControllerLayouts() {
  const initial = useState(() => loadControllerLayouts())[0];
  const [document, setDocument] = useState<ControllerLayoutsDocument>(() => initial.status === 'loaded' ? initial.document : createControllerLayoutsDocument());
  const [status, setStatus] = useState(initial.status === 'loaded'
    ? `Saved locally · ${initial.document.layouts.length} layout${initial.document.layouts.length === 1 ? '' : 's'}` : initial.message);
  const activeLayout = document.layouts.find((layout) => layout.id === document.selectedLayoutId);

  const persist = (next: ControllerLayoutsDocument, message: string) => {
    setDocument(next);
    setStatus(saveControllerLayouts(next) ? message : 'Controller layouts could not be saved in this browser.');
  };
  const createLayout = (name: string, expectedHardwarePatchName: string, notes: string) => {
    if (!name.trim()) return false;
    const layout: ControllerLayout = { schemaVersion: 1, id: nextId('layout'), name: name.trim(), deviceProfileId: 'asm-hydrasynth-explorer-2.2',
      ...(expectedHardwarePatchName.trim() ? { expectedHardwarePatchName: expectedHardwarePatchName.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}), lanes: [] };
    persist(createControllerLayoutsDocument([...document.layouts, layout], layout.id), `Saved layout “${layout.name}”.`);
    return true;
  };
  const selectLayout = (id: string) => persist(createControllerLayoutsDocument(document.layouts, id || undefined),
    id ? 'Selected controller layout.' : 'No controller layout selected. Raw addresses remain available.');
  const addLane = (label: string, address: ControlAddress, channel: number) => {
    if (!activeLayout || !label.trim()) return false;
    const duplicate = activeLayout.lanes.some((lane) => lane.channel === channel && JSON.stringify(lane.address) === JSON.stringify(address));
    if (duplicate) { setStatus('That address and channel already have a lane in this layout.'); return false; }
    const lane: ControllerLayoutLane = { id: nextId('lane'), label: label.trim(), address, channel };
    const nextLayout = { ...activeLayout, lanes: [...activeLayout.lanes, lane] };
    persist(createControllerLayoutsDocument(document.layouts.map((layout) => layout.id === nextLayout.id ? nextLayout : layout), nextLayout.id), `Saved lane “${lane.label}”.`);
    return true;
  };
  const removeLane = (laneId: string) => {
    if (!activeLayout) return;
    const nextLayout = { ...activeLayout, lanes: activeLayout.lanes.filter((lane) => lane.id !== laneId) };
    persist(createControllerLayoutsDocument(document.layouts.map((layout) => layout.id === nextLayout.id ? nextLayout : layout), nextLayout.id), 'Lane removed. Existing mappings retain their raw endpoint.');
  };
  const deleteActiveLayout = () => {
    if (!activeLayout) return;
    persist(createControllerLayoutsDocument(document.layouts.filter((layout) => layout.id !== activeLayout.id)), `Deleted layout “${activeLayout.name}”. Existing mappings retain their raw endpoints.`);
  };
  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    const result = importControllerLayouts(await file.text());
    if (result.status !== 'loaded') { setStatus(result.message); return; }
    persist(result.document, `Imported ${result.document.layouts.length} controller layout${result.document.layouts.length === 1 ? '' : 's'}.`);
  };

  return { document, activeLayout, status, createLayout, selectLayout, addLane, removeLane, deleteActiveLayout, importFile,
    exportLayouts: () => downloadControllerLayouts(document) };
}

export type ControllerLayoutsApi = ReturnType<typeof useControllerLayouts>;
