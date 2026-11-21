import { useState } from 'react';
import { Sparkles, Clock, Calendar, Leaf } from 'lucide-react';
import { getCurrentSeason, getRecommendedRecipes } from '../services/recommendationService';

export default function RecommendationsView({ recipes, onSelectRecipe }) {
  const [pantryText, setPantryText] = useState('');
  const [maxTime, setMaxTime] = useState(0);
  const [onlySeason, setOnlySeason] = useState(false);

  const currentSeason = getCurrentSeason();
  const recommended = getRecommendedRecipes(recipes, {
    pantryText,
    maxTime,
    onlyCurrentSeason: onlySeason
  });

  const formatHistoryBadge = (days) => {
    if (days === 999) return 'Nunca cocinada';
    if (days === 0) return 'Cocinada hoy';
    if (days === 1) return 'Hace 1 día';
    return `Hace ${days} días`;
  };

  return (
    <div className="space-y-6">
      {/* Panel de filtros */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          <h2 className="font-bold text-lg text-stone-800">¿Qué cocinamos hoy?</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Ingredientes que tienes en casa (separados por comas)
            </label>
            <input
              type="text"
              placeholder="Ej: pollo, zanahoria, arroz..."
              value={pantryText}
              onChange={(e) => setPantryText(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Tiempo máximo disponible
            </label>
            <select
              value={maxTime}
              onChange={(e) => setMaxTime(Number(e.target.value))}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value={0}>Cualquier duración</option>
              <option value={20}>Rápida (hasta 20 min)</option>
              <option value={40}>Media (hasta 40 min)</option>
              <option value={60}>Hasta 1 hora</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => setOnlySeason(!onlySeason)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer capitalize ${
              onlySeason
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
            }`}
          >
            <Leaf className="w-3.5 h-3.5" />
            Solo temporada actual ({currentSeason})
          </button>

          <span className="text-xs text-stone-400">
            Ordenado por rotación de historial
          </span>
        </div>
      </div>

      {/* Resultados recomendados */}
      {recommended.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-stone-200">
          <p className="text-stone-600 font-medium">No hay recetas que coincidan con esos filtros</p>
          <p className="text-stone-400 text-sm mt-1">Prueba a quitar algún ingrediente o ampliar el tiempo máximo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommended.map((recipe) => (
            <div
              key={recipe.id}
              onClick={() => onSelectRecipe(recipe)}
              className="bg-white rounded-xl border border-stone-200 p-5 hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                    <Calendar className="w-3 h-3" />
                    {formatHistoryBadge(recipe._daysAgo)}
                  </span>

                  {recipe._matchPercent !== null && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      {recipe._matchPercent}% despensa
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-lg text-stone-900 line-clamp-2">{recipe.titulo}</h3>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {recipe.tiempo_minutos} min
                </span>
                <span className="capitalize">{recipe.temporada.join(', ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}