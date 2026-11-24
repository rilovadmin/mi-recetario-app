import { storageService } from './storageService';

const PANTRY_KEY = 'recetario_pantry_v1';
const PANTRY_FILE = 'despensa.json';

export const PANTRY_STATES = {
  TENGO: 'tengo',
  POCO: 'poco',
  AGOTADO: 'agotado'
};

export function normalizeIngredientName(str) {
  return (str || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export const pantryService = {
  getAll() {
    const raw = localStorage.getItem(PANTRY_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  saveAll(items) {
    localStorage.setItem(PANTRY_KEY, JSON.stringify(items));
  },

  addItem({ nombre, categoria = 'despensa', estado = PANTRY_STATES.TENGO }) {
    const cleanName = nombre.trim();
    const normalizedTarget = normalizeIngredientName(cleanName);
    if (!normalizedTarget) return this.getAll();

    const items = this.getAll();
    const existingIdx = items.findIndex(
      (i) => normalizeIngredientName(i.nombre) === normalizedTarget
    );

    if (existingIdx >= 0) {
      items[existingIdx] = { ...items[existingIdx], categoria, estado };
    } else {
      items.push({
        id: crypto.randomUUID(),
        nombre: cleanName,
        categoria,
        estado
      });
    }

    this.saveAll(items);
    return items;
  },

  updateStatus(id, estado) {
    const items = this.getAll().map((item) =>
      item.id === id ? { ...item, estado } : item
    );
    this.saveAll(items);
    return items;
  },

  markAsReplenished(nombre) {
    const normalizedTarget = normalizeIngredientName(nombre);
    const items = this.getAll().map((item) =>
      normalizeIngredientName(item.nombre) === normalizedTarget
        ? { ...item, estado: PANTRY_STATES.TENGO }
        : item
    );
    this.saveAll(items);
    return items;
  },

  removeItem(id) {
    const items = this.getAll().filter((item) => item.id !== id);
    this.saveAll(items);
    return items;
  },

  findMatch(ingredientName, pantryItems = null) {
    const list = pantryItems || this.getAll();
    const normalizedTarget = normalizeIngredientName(ingredientName);
    if (!normalizedTarget) return null;
    return list.find((item) => normalizeIngredientName(item.nombre) === normalizedTarget) || null;
  },

  async pushToGitHub(items) {
    await storageService.pushJsonToGitHub(
      PANTRY_FILE,
      items,
      `Actualizar despensa (${new Date().toLocaleString('es-ES')})`
    );
  },

  async syncFromGitHub() {
    if (!storageService.getGitHubConfig()) return this.getAll();
    const remote = await storageService.fetchJsonFromGitHub(PANTRY_FILE);
    if (!remote) {
      const local = this.getAll();
      if (local.length > 0) await this.pushToGitHub(local);
      return local;
    }
    if (Array.isArray(remote)) {
      this.saveAll(remote);
      return remote;
    }
    return this.getAll();
  }
};