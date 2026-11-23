import { useState, useRef, useEffect } from 'react';
import {
  Plus, Search, Download, Upload, Clock, Users, ChefHat,
  Cloud, CloudOff, RefreshCw, Sparkles, CalendarDays, BookOpen, Package, Snowflake
} from 'lucide-react';
import { storageService } from './services/storageService';
import { pantryService, PANTRY_STATES } from './services/pantryService';
import RecipeForm from './components/RecipeForm';
import RecipeDetail from './components/RecipeDetail';
import SyncModal from './components/SyncModal';
import RecommendationsView from './components/RecommendationsView';
import WeekendPlanner from './components/WeekendPlanner';
import PantryView from './components/PantryView';

const PLAN_KEY = 'recetario_weekend_v1';
const PLAN_FILE = 'plan_semanal.json';

export default function App() {
  const [recipes, setRecipes] = useState(() => storageService.getAll());
  const [pantryItems, setPantryItems] = useState(() => pantryService.getAll());
  const [plan, setPlan] = useState(() => {
    const saved = localStorage.getItem(PLAN_KEY);
    return saved ? JSON.parse(saved) : {};
  });
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('recipes');
  const [view, setView] = useState('list');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState(() =>
    storageService.getGitHubConfig() ? 'syncing' : 'disconnected'
  );
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!storageService.getGitHubConfig()) return;
    Promise.all([
      storageService.syncFromGitHub(),
      pantryService.syncFromGitHub(),
      storageService.fetchJsonFromGitHub(PLAN_FILE)
    ])
      .then(([remoteRecipes, remotePantry, remotePlan]) => {
        setRecipes(remoteRecipes);
        setPantryItems(remotePantry);
        if (remotePlan && typeof remotePlan === 'object') {
          localStorage.setItem(PLAN_KEY, JSON.stringify(remotePlan));
          setPlan(remotePlan);
        }
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

  const handleUpdatePantry = async (updatedPantry) => {
    setPantryItems(updatedPantry);
    if (!storageService.getGitHubConfig()) return;
    setSyncStatus('syncing');
    try {
      await pantryService.pushToGitHub(updatedPantry);
      setSyncStatus('synced');
    } catch {
      setSyncStatus('error');
    }
  };

  const handleUpdatePlan = async (updatedPlan) => {
    setPlan(updatedPlan);
    localStorage.setItem(PLAN_KEY, JSON.stringify(updatedPlan));
    if (!storageService.getGitHubConfig()) return;
    setSyncStatus('syncing');
    try {
      await storageService.pushJsonToGitHub(
        PLAN_FILE,
        updatedPlan,
        `Actualizar plan semanal (${new Date().toLocaleString('es-ES')})`
      );
      setSyncStatus('synced');
    } catch {
      setSyncStatus('error');
    }
  };

  const handleUpdateStock = async (id, delta, cookedDate = null) => {
    const updated = storageService.updateRecipeStock(id, delta, cookedDate);
    setRecipes(updated);
    if (selectedRecipe && selectedRecipe.id === id) {
      const refreshed = updated.find((r) => r.id === id);
      if (refreshed) setSelectedRecipe(refreshed);
    }
    await syncToCloud(updated);
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
    await handleUpdateStock(id, 0, hoy);
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

  const openRecipeDetail = (recipe) => {
    setSelectedRecipe(recipe);
    setView('detail');
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setView('list');
    setSelectedRecipe(null);
  };

  const lowPantryCount = pantryItems.filter(
    (i) => i.estado === PANTRY_STATES.POCO || i.estado === PANTRY_STATES.AGOTADO
  ).length;

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
            onClick={() => switchTab('recipes')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <ChefHat className="w-7 h-7 text-emerald-600" />
            <span className="font-bold text-xl tracking-tight">Mi Recetario</span>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Barra de navegación de secciones */}
        <nav className="max-w-5xl mx-auto px-4 flex gap-1 border-t border-stone-100 overflow-x-auto">
          <button
            onClick={() => switchTab('recipes')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'recipes' && view === 'list'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Recetario ({recipes.length})
          </button>

          <button
            onClick={() => switchTab('recommendations')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'recommendations' && view === 'list'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Recomendaciones
          </button>

          <button
            onClick={() => switchTab('weekend')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'weekend' && view === 'list'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <CalendarDays className="w-4 h-4" /> Planificador
          </button>

          <button
            onClick={() => switchTab('pantry')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'pantry' && view === 'list'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Package className="w-4 h-4" /> Despensa
            {lowPantryCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                {lowPantryCount}
              </span>
            )}
          </button>
        </nav>
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
            onUpdateStock={handleUpdateStock}
          />
        )}

        {view === 'list' && activeTab === 'recommendations' && (
          <RecommendationsView recipes={recipes} onSelectRecipe={openRecipeDetail} />
        )}

        {view === 'list' && activeTab === 'weekend' && (
          <WeekendPlanner
            recipes={recipes}
            pantryItems={pantryItems}
            plan={plan}
            onUpdatePlan={handleUpdatePlan}
            onUpdatePantry={handleUpdatePantry}
            onUpdateStock={handleUpdateStock}
            onSelectRecipe={openRecipeDetail}
          />
        )}

        {view === 'list' && activeTab === 'pantry' && (
          <PantryView items={pantryItems} onUpdatePantry={handleUpdatePantry} />
        )}

        {view === 'list' && activeTab === 'recipes' && (
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
                    onClick={() => openRecipeDetail(recipe)}
                    className="bg-white rounded-xl border border-stone-200 p-5 hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-lg text-stone-900 line-clamp-2">{recipe.titulo}</h3>
                        {(recipe.raciones_disponibles || 0) > 0 && (
                          <span
                            className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-xs font-bold"
                            title="Raciones disponibles en frigorífico o congelador"
                          >
                            <Snowflake className="w-3 h-3" /> {recipe.raciones_disponibles}
                          </span>
                        )}
                      </div>
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
            pantryService.syncFromGitHub().then(setPantryItems).catch(() => {});
            storageService
              .fetchJsonFromGitHub(PLAN_FILE)
              .then((remotePlan) => {
                if (remotePlan) {
                  localStorage.setItem(PLAN_KEY, JSON.stringify(remotePlan));
                  setPlan(remotePlan);
                }
              })
              .catch(() => {});
            setSyncStatus(storageService.getGitHubConfig() ? 'synced' : 'disconnected');
          }}
        />
      )}
    </div>
  );
}