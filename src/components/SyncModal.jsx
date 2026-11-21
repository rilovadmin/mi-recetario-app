import { useState } from 'react';
import { X, Cloud, Check, Unlink } from 'lucide-react';
import { storageService } from '../services/storageService';

export default function SyncModal({ onClose, onSynced }) {
  const existing = storageService.getGitHubConfig();
  const [owner, setOwner] = useState(existing?.owner || '');
  const [repo, setRepo] = useState(existing?.repo || 'mi-recetario-datos');
  const [token, setToken] = useState(existing?.token || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const config = { owner: owner.trim(), repo: repo.trim(), token: token.trim() };

    try {
      const recipes = await storageService.syncFromGitHub(config);
      storageService.saveGitHubConfig(config);
      onSynced(recipes);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    storageService.saveGitHubConfig(null);
    onSynced(storageService.getAll());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2 font-bold text-stone-800">
            <Cloud className="w-5 h-5 text-emerald-600" />
            <span>Sincronización con GitHub</span>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-stone-500 leading-relaxed">
          Tus recetas se guardarán en un archivo <code className="bg-stone-100 px-1 rounded">recetas.json</code> dentro de tu repositorio privado. Introduce los mismos datos en todos tus dispositivos.
        </p>

        <form onSubmit={handleConnect} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Tu usuario de GitHub</label>
            <input
              type="text"
              required
              placeholder="Ej: juanperez"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Nombre del repositorio</label>
            <input
              type="text"
              required
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Token de acceso (github_pat_...)</label>
            <input
              type="password"
              required
              placeholder="Pega aquí tu token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {existing ? (
              <button
                type="button"
                onClick={handleDisconnect}
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 cursor-pointer"
              >
                <Unlink className="w-3.5 h-3.5" /> Desconectar
              </button>
            ) : <div />}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {loading ? 'Conectando...' : 'Guardar y sincronizar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}