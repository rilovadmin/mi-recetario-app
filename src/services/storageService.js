import { normalizeRecipe } from '../models/recipeModel';

const STORAGE_KEY = 'recetario_db_v1';
const GITHUB_CONFIG_KEY = 'recetario_github_config_v1';
const RECIPES_FILE = 'recetas.json';

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUtf8(base64) {
  const binary = atob(base64.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export const storageService = {
  getAll() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw).map(normalizeRecipe);
  },

  saveAll(recipes) {
    const normalized = recipes.map(normalizeRecipe);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  },

  saveRecipe(recipe) {
    const recipes = this.getAll();
    const cleanRecipe = normalizeRecipe(recipe);
    const index = recipes.findIndex((r) => r.id === cleanRecipe.id);
    if (index >= 0) {
      recipes[index] = cleanRecipe;
    } else {
      recipes.unshift(cleanRecipe);
    }
    this.saveAll(recipes);
    return recipes;
  },

  deleteRecipe(id) {
    const recipes = this.getAll().filter((r) => r.id !== id);
    this.saveAll(recipes);
    return recipes;
  },

  updateRecipeStock(id, delta, cookedDate = null) {
    const recipes = this.getAll();
    const index = recipes.findIndex((r) => r.id === id);
    if (index < 0) return recipes;

    const current = recipes[index];
    const nextStock = Math.max(0, (current.raciones_disponibles || 0) + delta);
    const nextHistory = cookedDate
      ? [...(current.historial_cocinado || []), cookedDate]
      : current.historial_cocinado || [];

    recipes[index] = {
      ...current,
      raciones_disponibles: nextStock,
      historial_cocinado: nextHistory
    };
    this.saveAll(recipes);
    return recipes;
  },

  exportJSON() {
    const data = JSON.stringify(this.getAll(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recetario_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async importJSON(file) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error('El archivo no tiene el formato correcto.');
    }
    const normalized = parsed.map(normalizeRecipe);
    this.saveAll(normalized);
    return normalized;
  },

  // --- SINCRONIZACIÓN GENÉRICA CON GITHUB ---

  getGitHubConfig() {
    const raw = localStorage.getItem(GITHUB_CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  saveGitHubConfig(config) {
    if (!config) {
      localStorage.removeItem(GITHUB_CONFIG_KEY);
      return;
    }
    localStorage.setItem(
      GITHUB_CONFIG_KEY,
      JSON.stringify({
        owner: config.owner.trim(),
        repo: config.repo.trim(),
        token: config.token.trim()
      })
    );
  },

  async _fetchGitHubRaw(filePath, config) {
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${filePath}`;
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github+json'
      }
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Error de GitHub (${res.status}). Revisa tu usuario, repositorio y token.`);
    }
    return res.json();
  },

  async fetchJsonFromGitHub(filePath, customConfig = null) {
    const config = customConfig || this.getGitHubConfig();
    if (!config) return null;
    const fileData = await this._fetchGitHubRaw(filePath, config);
    if (!fileData) return null;
    return JSON.parse(base64ToUtf8(fileData.content));
  },

  async pushJsonToGitHub(filePath, data, commitMessage, customConfig = null) {
    const config = customConfig || this.getGitHubConfig();
    if (!config) return;

    const existing = await this._fetchGitHubRaw(filePath, config);
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${filePath}`;
    const body = {
      message: commitMessage,
      content: utf8ToBase64(JSON.stringify(data, null, 2))
    };
    if (existing?.sha) {
      body.sha = existing.sha;
    }

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error(`No se pudo guardar ${filePath} en GitHub (${res.status}).`);
    }
  },

  async pushToGitHub(recipes, customConfig = null) {
    await this.pushJsonToGitHub(
      RECIPES_FILE,
      recipes.map(normalizeRecipe),
      `Actualizar recetas (${new Date().toLocaleString('es-ES')})`,
      customConfig
    );
  },

  async syncFromGitHub(customConfig = null) {
    const config = customConfig || this.getGitHubConfig();
    if (!config) return this.getAll();

    const remoteRecipes = await this.fetchJsonFromGitHub(RECIPES_FILE, config);
    if (!remoteRecipes) {
      const localRecipes = this.getAll();
      await this.pushToGitHub(localRecipes, config);
      return localRecipes;
    }

    if (Array.isArray(remoteRecipes)) {
      const normalized = remoteRecipes.map(normalizeRecipe);
      this.saveAll(normalized);
      return normalized;
    }
    return this.getAll();
  }
};