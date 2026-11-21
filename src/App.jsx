import { useState, useRef, useEffect } from 'react';
import { Plus, Search, Download, Upload, Clock, Users, ChefHat, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { storageService } from './services/storageService';
import RecipeForm from './components/RecipeForm';
import RecipeDetail from './components/RecipeDetail';
import SyncModal from './components/SyncModal';

export default function App() {
  const [recipes, setRecipes] = useState(() => storageService.getAll());
  const [search, setSearch] = useState('');
  const [view, setView] = useState('list');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState(() =>
    storageService.getGitHubConfig() ? 'syncing' : 'disconnected'
  );
  const fileInputRef = useRef(null);

  // Sincronizar automáticamente al abrir la app
  useEffect(() => {
    if (!storageService.getGitHubConfig()) return;
    storageService
      .syncFromGitHub()
      .then((remoteRecipes) => {
        setRecipes(remoteRecipes);
        setSyncStatus('synced');
      })
      .catch(() => setSyncStatus('error'));
  }, []);

  const syncToCloud = async (updatedList) => {
    if (!storageService.getGitHubConfig()) return;
    setSyncStatus('syncing');
    try {
      await storageService.pushToGitHub(updatedList);
      setSyncStatus('synced');
    } catch {
      setSyncStatus('error');
    }
  };

  const handleSaveRecipe = async (recipe) => {
    const updated = storageService.saveRecipe(recipe);
    setRecipes(updated);
    setSelectedRecipe(recipe);
    setView('detail');
    await syncToCloud(updated);
  };

  const handleDeleteRecipe = async (id) => {
    const updated = storageService.deleteRecipe(id);
    setRecipes(updated);
    setSelectedRecipe(null);
    setView('list');
    await syncToCloud(updated);
  };

  const handleMarkCooked = async (id) => {
    const hoy = new Date().toISOString().split('T')[0];
    const target = recipes.find((r) => r.id === id);
    if (!target) return;
    const updatedRecipe = {
      ...target,
      historial_cocinado: [...(target.historial_cocinado || []), hoy]
    };
    const updatedList = storageService.saveRecipe(updatedRecipe);
    setRecipes(updatedList);
    setSelectedRecipe(updatedRecipe);
    await syncToCloud(updatedList);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await storageService.importJSON(file);
      setRecipes(imported);
      await syncToCloud(imported);
      alert(`Se han importado ${imported.length} recetas correctamente.`);
    } catch (err) {
      alert('Error al importar el archivo: ' + err.message);
    }
    e.target.value = '';
  };

  const filteredRecipes = recipes.filter((r) => {
    const q = search.toLowerCase();
    const matchTitle = r.titulo.toLowerCase().includes(q);
    const matchTag = r.etiquetas?.some((t) => t.toLowerCase().includes(q));
    const matchIng = r.ingredientes?.some((i) => i.nombre.toLowerCase().includes(q));
    return matchTitle || matchTag || matchIng;
  });

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 pb-12">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div
            onClick={() => { setView('list'); setSelectedRecipe(null); }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <ChefHat className="w-7 h-7 text-emerald-600" />
            <span className="font-bold text-xl tracking-tight">Mi Recetario</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Botón de estado de sincronización */}
            <button
              onClick={() => setShowSyncModal(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm cursor-pointer ${
                syncStatus === 'synced'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : syncStatus === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-stone-200 text-stone-700 hover:bg-stone-50'
              }`}
              title="Configurar sincronización en la nube"
            >
              {syncStatus === 'syncing' && <RefreshCw className="w-4 h-4 animate-spin" />}
              {syncStatus === 'synced' && <Cloud className="w-4 h-4" />}
              {(syncStatus === 'disconnected' || syncStatus === 'error') && <CloudOff className="w-4 h-4" />}
              <span className="hidden sm:inline">
                {syncStatus === 'syncing' && 'Sincronizando...'}
                {syncStatus === 'synced' && 'Sincronizado'}
                {syncStatus === 'error' && 'Error nube'}
                {syncStatus === 'disconnected' && 'Conectar nube'}
              </span>
            </button>

            <button
              onClick={() => storageService.exportJSON()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-700 hover:bg-stone-50 cursor-pointer"
              title="Descargar copia de seguridad JSON"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-700 hover:bg-stone-50 cursor-pointer"
              title="Restaurar desde archivo JSON"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Importar</span>
            </button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />

            <button
              onClick={() => { setSelectedRecipe(null); setView('form'); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Nueva receta
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-6">
        {view === 'form' && (
          <RecipeForm
            initialRecipe={selectedRecipe}
            onSave={handleSaveRecipe}
            onCancel={() => setView(selectedRecipe ? 'detail' : 'list')}
          />
        )}

        {view === 'detail' && selectedRecipe && (
          <RecipeDetail
            recipe={selectedRecipe}
            onBack={() => { setView('list'); setSelectedRecipe(null); }}
            onEdit={(rec) => { setSelectedRecipe(rec); setView('form'); }}
            onDelete={handleDeleteRecipe}
            onMarkCooked={handleMarkCooked}
          />
        )}

        {view === 'list' && (
          <div className="space-y-6">
            <div className="relative">
              <Search className="w-5 h-5 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Buscar por plato, ingrediente o etiqueta..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white rounded-xl border border-stone-200 pl-11 pr-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {filteredRecipes.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
                <ChefHat className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-600 font-medium">Aún no hay recetas que mostrar</p>
                <p className="text-stone-400 text-sm mt-1">Pulsa "Nueva receta" para añadir la primera o importa una copia JSON.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    onClick={() => { setSelectedRecipe(recipe); setView('detail'); }}
                    className="bg-white rounded-xl border border-stone-200 p-5 hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="font-bold text-lg text-stone-900 line-clamp-2">{recipe.titulo}</h3>
                      <div className="flex items-center gap-4 mt-2 text-xs text-stone-500">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {recipe.tiempo_minutos} min</span>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {recipe.raciones_base} rac.</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                      <div className="flex flex-wrap gap-1">
                        {recipe.etiquetas?.slice(0, 2).map((tag) => (
                          <span key={tag} className="px-2 py-0.5 rounded bg-stone-100 text-stone-600">#{tag}</span>
                        ))}
                      </div>
                      <span className="text-stone-400">
                        {recipe.historial_cocinado?.length
                          ? `Cocinada ${recipe.historial_cocinado.length}x`
                          : 'Sin cocinar'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {showSyncModal && (
        <SyncModal
          onClose={() => setShowSyncModal(false)}
          onSynced={(updatedRecipes) => {
            setRecipes(updatedRecipes);
            setSyncStatus(storageService.getGitHubConfig() ? 'synced' : 'disconnected');
          }}
        />
      )}
    </div>
  );
}