const STORAGE_KEY = 'recetario_db_v1';
const GITHUB_CONFIG_KEY = 'recetario_github_config_v1';
const FILE_PATH = 'recetas.json';

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
    return raw ? JSON.parse(raw) : [];
  },

  saveAll(recipes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
  },

  saveRecipe(recipe) {
    const recipes = this.getAll();
    const index = recipes.findIndex((r) => r.id === recipe.id);
    if (index >= 0) {
      recipes[index] = recipe;
    } else {
      recipes.unshift(recipe);
    }
    this.saveAll(recipes);
    return recipes;
  },

  deleteRecipe(id) {
    const recipes = this.getAll().filter((r) => r.id !== id);
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
    this.saveAll(parsed);
    return parsed;
  },

  // --- SINCRONIZACIÓN CON GITHUB ---

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

  async _fetchGitHubFile(config) {
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${FILE_PATH}`;
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

  async pushToGitHub(recipes, customConfig = null) {
    const config = customConfig || this.getGitHubConfig();
    if (!config) return;

    const existing = await this._fetchGitHubFile(config);
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${FILE_PATH}`;
    const body = {
      message: `Actualizar recetas (${new Date().toLocaleString('es-ES')})`,
      content: utf8ToBase64(JSON.stringify(recipes, null, 2))
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
      throw new Error(`No se pudo guardar en GitHub (${res.status}).`);
    }
  },

  async syncFromGitHub(customConfig = null) {
    const config = customConfig || this.getGitHubConfig();
    if (!config) return this.getAll();

    const fileData = await this._fetchGitHubFile(config);
    if (!fileData) {
      // Si el repositorio aún está vacío, subimos las recetas locales actuales
      const localRecipes = this.getAll();
      await this.pushToGitHub(localRecipes, config);
      return localRecipes;
    }

    const decoded = base64ToUtf8(fileData.content);
    const remoteRecipes = JSON.parse(decoded);
    if (Array.isArray(remoteRecipes)) {
      this.saveAll(remoteRecipes);
      return remoteRecipes;
    }
    return this.getAll();
  }
};