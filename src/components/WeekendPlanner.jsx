import { useState, useEffect } from 'react';
import { CalendarDays, ShoppingCart, Sparkles, RotateCcw, Check, Users } from 'lucide-react';
import { getRecommendedRecipes } from '../services/recommendationService';

const WEEKEND_KEY = 'recetario_weekend_v1';
const CHECKED_KEY = 'recetario_shopping_checked_v1';

const SLOTS = [
  { key: 'sabado_comida', label: 'Sábado · Comida' },
  { key: 'sabado_cena', label: 'Sábado · Cena' },
  { key: 'domingo_comida', label: 'Domingo · Comida' },
  { key: 'domingo_cena', label: 'Domingo · Cena' }
];

export default function WeekendPlanner({ recipes, onSelectRecipe }) {
  const [plan, setPlan] = useState(() => {
    const saved = localStorage.getItem(WEEKEND_KEY);
    return saved ? JSON.parse(saved) : {};
  });

  const [checkedItems, setCheckedItems] = useState(() => {
    const saved = localStorage.getItem(CHECKED_KEY);
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem(WEEKEND_KEY, JSON.stringify(plan));
  }, [plan]);

  useEffect(() => {
    localStorage.setItem(CHECKED_KEY, JSON.stringify(checkedItems));
  }, [checkedItems]);

  const assignRecipe = (slotKey, recipeId) => {
    if (!recipeId) {
      const updated = { ...plan };
      delete updated[slotKey];
      setPlan(updated);
      return;
    }
    const recipe = recipes.find((r) => r.id === recipeId);
    setPlan({
      ...plan,
      [slotKey]: {
        recipeId,
        raciones: recipe?.raciones_base || 2
      }
    });
  };

  const updateSlotRaciones = (slotKey, delta) => {
    const current = plan[slotKey];
    if (!current) return;
    setPlan({
      ...plan,
      [slotKey]: {
        ...current,
        raciones: Math.max(1, current.raciones + delta)
      }
    });
  };

  const handleAutoSuggest = () => {
    const suggestions = getRecommendedRecipes(recipes, { onlyCurrentSeason: false });
    if (suggestions.length === 0) return;

    const usedIds = new Set(Object.values(plan).map((s) => s.recipeId));
    const available = suggestions.filter((r) => !usedIds.has(r.id));
    const pool = available.length >= 4 ? available : suggestions;

    const nextPlan = { ...plan };
    let idx = 0;
    for (const slot of SLOTS) {
      if (!nextPlan[slot.key] && pool[idx]) {
        nextPlan[slot.key] = {
          recipeId: pool[idx].id,
          raciones: pool[idx].raciones_base || 2
        };
        idx++;
      }
    }
    setPlan(nextPlan);
  };

  const handleClearPlan = () => {
    setPlan({});
    setCheckedItems({});
  };

  // Agregar y sumar ingredientes por categoría
  const shoppingByCategory = (() => {
    const aggregated = {};

    for (const slot of SLOTS) {
      const entry = plan[slot.key];
      if (!entry) continue;
      const recipe = recipes.find((r) => r.id === entry.recipeId);
      if (!recipe) continue;

      const factor = entry.raciones / (recipe.raciones_base || 1);

      for (const ing of recipe.ingredientes || []) {
        const cleanName = ing.nombre.trim().toLowerCase();
        if (!cleanName) continue;

        const key = `${cleanName}__${ing.unidad}`;
        if (!aggregated[key]) {
          aggregated[key] = {
            key,
            nombre: ing.nombre.trim(),
            unidad: ing.unidad,
            categoria: ing.categoria || 'otros',
            cantidad: 0
          };
        }
        aggregated[key].cantidad += (Number(ing.cantidad) || 0) * factor;
      }
    }

    const grouped = {};
    for (const item of Object.values(aggregated)) {
      if (!grouped[item.categoria]) grouped[item.categoria] = [];
      grouped[item.categoria].push(item);
    }
    return grouped;
  })();

  const toggleCheck = (key) => {
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const formatQty = (num) => (Number.isInteger(num) ? num : Number(num.toFixed(1)));
  const hasCategories = Object.keys(shoppingByCategory).length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Columna izquierda: Menú del fin de semana */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-lg text-stone-800">Menú Fin de Semana</h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoSuggest}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" /> Rellenar sugerencias
              </button>
              <button
                type="button"
                onClick={handleClearPlan}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 text-stone-500 hover:text-stone-800 text-xs cursor-pointer"
                title="Limpiar fin de semana"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Limpiar
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {SLOTS.map((slot) => {
              const entry = plan[slot.key];
              const assignedRecipe = entry ? recipes.find((r) => r.id === entry.recipeId) : null;

              return (
                <div key={slot.key} className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      {slot.label}
                    </span>

                    {assignedRecipe && (
                      <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-md border border-stone-200 text-xs">
                        <Users className="w-3.5 h-3.5 text-emerald-600" />
                        <button
                          type="button"
                          onClick={() => updateSlotRaciones(slot.key, -1)}
                          className="px-1.5 font-bold text-stone-600 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-semibold">{entry.raciones} rac.</span>
                        <button
                          type="button"
                          onClick={() => updateSlotRaciones(slot.key, 1)}
                          className="px-1.5 font-bold text-stone-600 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={entry?.recipeId || ''}
                      onChange={(e) => assignRecipe(slot.key, e.target.value)}
                      className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Elegir receta --</option>
                      {recipes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.titulo} ({r.tiempo_minutos} min)
                        </option>
                      ))}
                    </select>

                    {assignedRecipe && (
                      <button
                        type="button"
                        onClick={() => onSelectRecipe(assignedRecipe)}
                        className="px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs font-medium text-stone-700 hover:bg-stone-100 cursor-pointer"
                      >
                        Ver
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Columna derecha: Lista de la compra automática */}
      <div className="lg:col-span-5">
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4 sticky top-20">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <ShoppingCart className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-lg text-stone-800">Lista de la compra</h2>
          </div>

          {!hasCategories ? (
            <p className="text-sm text-stone-400 py-8 text-center">
              Asigna recetas al sábado o domingo para generar automáticamente los ingredientes agrupados.
            </p>
          ) : (
            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              {Object.entries(shoppingByCategory).map(([category, items]) => (
                <div key={category} className="space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                    {category}
                  </h3>
                  <ul className="space-y-1">
                    {items.map((item) => {
                      const isChecked = !!checkedItems[item.key];
                      return (
                        <li
                          key={item.key}
                          onClick={() => toggleCheck(item.key)}
                          className={`flex items-center justify-between p-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-stone-50 border-stone-100 text-stone-400 line-through'
                              : 'bg-white border-stone-200 text-stone-800 hover:bg-stone-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-4 h-4 rounded flex items-center justify-center border ${
                                isChecked
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-stone-300'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3" />}
                            </span>
                            <span className="capitalize">{item.nombre}</span>
                          </div>
                          <span className="font-semibold text-xs text-stone-500">
                            {item.unidad === 'al gusto' ? 'al gusto' : `${formatQty(item.cantidad)} ${item.unidad}`}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}