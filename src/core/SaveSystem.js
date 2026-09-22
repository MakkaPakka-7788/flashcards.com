const KEY = 'fableCitiesSave';

function clean(value) {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(clean);
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (k === 'curve' || k === 'base' || k === 'mesh' || k === 'group' || k === 'material' || k === 'geometry') continue;
    if (typeof v === 'function') continue;
    try {
      out[k] = clean(v);
    } catch {}
  }
  return out;
}

export function saveCity(world) {
  const data = {
    version: 1,
    seed: world.seed,
    economy: clean(world.economy),
    time: clean(world.time),
    env: clean(world.env),
    roads: [...world.roads.segments.values()].map(s => ({
      id: s.id,
      type: s.type || 'street',
      points: Array.isArray(s.points)
        ? s.points.map(p => ({ x: p.x, y: p.y || 0, z: p.z }))
        : []
    })).filter(s => s.points.length >= 2),
    zones: world.zones.api && world.zones.api.grid
      ? [...world.zones.api.grid.paint.entries()]
      : [],
    buildings: clean(world.buildings.list || [])
  };

  localStorage.setItem(KEY, JSON.stringify(data));
  return true;
}

export function hasSavedCity() {
  return !!localStorage.getItem(KEY);
}

export function deleteSavedCity() {
  localStorage.removeItem(KEY);
}

export function loadCity(world) {
  const raw = localStorage.getItem(KEY);
  if (!raw) return false;

  let data;

  try {
    data = JSON.parse(raw);
  } catch {
    return false;
  }

  if (data.economy) Object.assign(world.economy, data.economy);
  if (data.time) Object.assign(world.time, data.time);
  if (data.env) Object.assign(world.env, data.env);

  return data;
}
