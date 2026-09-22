const KEY = 'fableCitiesSave';

function clean(value) {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(clean);

  const out = {};

  for (const [k, v] of Object.entries(value)) {
    if (
      k === 'curve' ||
      k === 'base' ||
      k === 'mesh' ||
      k === 'group' ||
      k === 'material' ||
      k === 'geometry' ||
      k === 'api'
    ) continue;

    if (typeof v === 'function') continue;

    try {
      out[k] = clean(v);
    } catch {}
  }

  return out;
}

function clonePoints(points) {
  if (!Array.isArray(points)) return [];

  return points
    .map(p => ({
      x: Number(p.x) || 0,
      y: Number(p.y) || 0,
      z: Number(p.z) || 0
    }))
    .filter(p => Number.isFinite(p.x) && Number.isFinite(p.z));
}

export function saveCity(world) {
  const data = {
    version: 2,
    seed: world.seed,
    economy: clean(world.economy),
    time: clean(world.time),
    env: clean(world.env),

    roads: [...world.roads.segments.values()]
      .map(seg => ({
        id: seg.id,
        type: seg.type || 'local',
        points: clonePoints(seg.points)
      }))
      .filter(seg => seg.points.length >= 2),

    zones: world.zones?.api?.grid
      ? [...world.zones.api.grid.paint.entries()]
      : [],

    buildings: clean(world.buildings?.list || [])
  };

  localStorage.setItem(KEY, JSON.stringify(data));

  return data;
}

export function hasSavedCity() {
  return !!localStorage.getItem(KEY);
}

export function deleteSavedCity() {
  localStorage.removeItem(KEY);
}

export function getSavedCity() {
  const raw = localStorage.getItem(KEY);

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loadCity(world) {
  const data = getSavedCity();

  if (!data) return false;

  if (data.economy) {
    Object.assign(world.economy, data.economy);
  }

  if (data.time) {
    Object.assign(world.time, data.time);
  }

  if (data.env) {
    Object.assign(world.env, data.env);
  }

  if (Number.isFinite(data.seed)) {
    world.seed = data.seed;
  }

  return data;
}

export function restoreRoads(world, data) {
  const roads = world.roads?.api;

  if (!roads || !Array.isArray(data?.roads)) {
    return false;
  }

  roads.clear();

  for (const saved of data.roads) {
    if (!Array.isArray(saved.points) || saved.points.length < 2) {
      continue;
    }

    try {
      roads.build(
        saved.points.map(p => ({
          x: p.x,
          z: p.z
        })),
        saved.type || 'local',
        {
          curve: 'straight'
        }
      );
    } catch (err) {
      console.error('[SaveSystem] road restore failed', saved, err);
    }
  }

  return true;
}
