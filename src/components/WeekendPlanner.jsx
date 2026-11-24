import { useState, useEffect } from 'react';
import {
  CalendarDays, ShoppingCart, Sparkles, RotateCcw, Check, Users,
  Flame, Snowflake, PackagePlus, PackageCheck, ChevronDown, ChevronUp, Undo2, Plus, X
} from 'lucide-react';
import { getRecommendedRecipes } from '../services/recommendationService';
import { pantryService, PANTRY_STATES } from '../services/pantryService';

const CHECKED_KEY = 'recetario_shopping_checked_v1';

const DAYS = [
  { id: 'lunes', label: 'Lunes', isWeekend: false },
  { id: 'martes', label: 'Martes', isWeekend: false },
  { id: 'miercoles', label: 'Miércoles', isWeekend: false },
  { id: 'jueves', label: 'Jueves', isWeekend: false },
  { id: 'viernes', label: 'Viernes', isWeekend: false },
  { id: 'sabado', label: 'Sábado', isWeekend: true },
  { id: 'domingo', label: 'Domingo', isWeekend: true }
];

const MEALS = [
  { id: 'comida', label: 'Comida' },
  { id: 'cena', label: 'Cena' }
];

const ALL_SLOTS = DAYS.flatMap((day) =>
  MEALS.map((meal) => ({
    key: `${day.id}_${meal.id}`,
    dayLabel: day.label,
    mealLabel: meal.label,
    isWeekend: day.isWeekend
  }))
);

function normalizeDish(entry, fallbackIdx = 0) {
  return {
    uid: entry.uid || `${entry.recipeId}_${fallbackIdx}`,
    recipeId: entry.recipeId,
    mode: entry.mode || 'cook',
    racionesCocinar: Number(entry.racionesCocinar ?? entry.raciones ?? 2),
    racionesComer: Number(entry.racionesComer ?? entry.raciones ?? 2),
    completed: !!entry.completed,
    appliedDelta: Number(entry.appliedDelta || 0)
  };
}

function getSlotDishes(rawSlot) {
  if (!rawSlot) return [];
  if (Array.isArray(rawSlot)) {
    return rawSlot.filter((d) => d && d.recipeId).map((d, idx) => normalizeDish(d, idx));
  }
  if (rawSlot.recipeId) {
    return [normalizeDish(rawSlot, 0)];
  }
  return [];
}

export default function WeekendPlanner({
  recipes,
  pantryItems,
  plan,
  onUpdatePlan,
  onUpdatePantry,
  onUpdateStock,
  onSelectRecipe
}) {
  const [scope, setScope] = useState('week');
  const [addingToSlot, setAddingToSlot] = useState(null);
  const [showCoveredPantry, setShowCoveredPantry] = useState(false);
  const [checkedItems, setCheckedItems] = useState(() => {
    const saved = localStorage.getItem(CHECKED_KEY);
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem(CHECKED_KEY, JSON.stringify(checkedItems));
  }, [checkedItems]);

  const visibleDays = scope === 'weekend' ? DAYS.filter((d) => d.isWeekend) : DAYS;

  const buildDefaultDish = (recipeId) => {
    const recipe = recipes.find((r) => r.id === recipeId);
    const stock = recipe?.raciones_disponibles || 0;
    const base = recipe?.raciones_base || 2;
    const defaultMode = stock > 0 ? 'tupper' : 'cook';
    const defaultComer = defaultMode === 'tupper' ? Math.min(2, stock) : Math.min(2, base);

    return {
      uid: crypto.randomUUID(),
      recipeId,
      mode: defaultMode,
      racionesCocinar: base,
      racionesComer: defaultComer,
      completed: false,
      appliedDelta: 0
    };
  };

  const addDishToSlot = (slotKey, recipeId) => {
    if (!recipeId) return;
    const currentDishes = getSlotDishes(plan[slotKey]);
    const newDish = buildDefaultDish(recipeId);
    onUpdatePlan({
      ...plan,
      [slotKey]: [...currentDishes, newDish]
    });
    setAddingToSlot(null);
  };

  const removeDishFromSlot = (slotKey, dishUid) => {
    const currentDishes = getSlotDishes(plan[slotKey]);
    const target = currentDishes.find((d) => d.uid === dishUid);
    if (target?.completed && target.appliedDelta !== 0) {
      onUpdateStock(target.recipeId, -target.appliedDelta, null);
    }

    const remaining = currentDishes.filter((d) => d.uid !== dishUid);
    const updatedPlan = { ...plan };
    if (remaining.length === 0) {
      delete updatedPlan[slotKey];
    } else {
      updatedPlan[slotKey] = remaining;
    }
    onUpdatePlan(updatedPlan);
  };

  const changeDishRecipe = (slotKey, dishUid, newRecipeId) => {
    if (!newRecipeId) {
      removeDishFromSlot(slotKey, dishUid);
      return;
    }
    const currentDishes = getSlotDishes(plan[slotKey]);
    const nextDishes = currentDishes.map((d) =>
      d.uid === dishUid && !d.completed ? { ...buildDefaultDish(newRecipeId), uid: dishUid } : d
    );
    onUpdatePlan({
      ...plan,
      [slotKey]: nextDishes
    });
  };

  const updateDishField = (slotKey, dishUid, changes) => {
    const currentDishes = getSlotDishes(plan[slotKey]);
    const nextDishes = currentDishes.map((d) => {
      if (d.uid !== dishUid || d.completed) return d;
      const updated = { ...d, ...changes };
      if (updated.mode === 'cook' && updated.racionesComer > updated.racionesCocinar) {
        updated.racionesComer = updated.racionesCocinar;
      }
      return updated;
    });

    onUpdatePlan({
      ...plan,
      [slotKey]: nextDishes
    });
  };

  const handleToggleCompleted = (slotKey, dishUid) => {
    const currentDishes = getSlotDishes(plan[slotKey]);
    const target = currentDishes.find((d) => d.uid === dishUid);
    if (!target) return;

    const recipe = recipes.find((r) => r.id === target.recipeId);
    if (!recipe) return;

    let updatedDish = target;
    if (!target.completed) {
      const today = new Date().toISOString().split('T')[0];
      if (target.mode === 'cook') {
        const sobras = Math.max(0, target.racionesCocinar - target.racionesComer);
        onUpdateStock(recipe.id, sobras, today);
        updatedDish = { ...target, completed: true, appliedDelta: sobras };
      } else {
        const delta = -Math.abs(target.racionesComer);
        onUpdateStock(recipe.id, delta, null);
        updatedDish = { ...target, completed: true, appliedDelta: delta };
      }
    } else {
      onUpdateStock(recipe.id, -target.appliedDelta, null);
      updatedDish = { ...target, completed: false, appliedDelta: 0 };
    }

    onUpdatePlan({
      ...plan,
      [slotKey]: currentDishes.map((d) => (d.uid === dishUid ? updatedDish : d))
    });
  };

  const handleAutoSuggest = () => {
    const suggestions = getRecommendedRecipes(recipes, { onlyCurrentSeason: false });
    if (suggestions.length === 0) return;

    const targetSlots = ALL_SLOTS.filter((s) => (scope === 'weekend' ? s.isWeekend : true));
    const usedIds = new Set(
      Object.values(plan).flatMap((slot) => getSlotDishes(slot).map((d) => d.recipeId))
    );
    const available = suggestions.filter((r) => !usedIds.has(r.id));
    const pool = available.length > 0 ? available : suggestions;

    const nextPlan = { ...plan };
    let idx = 0;

    for (const slot of targetSlots) {
      const existing = getSlotDishes(nextPlan[slot.key]);
      if (existing.length === 0 && pool[idx % pool.length]) {
        const chosen = pool[idx % pool.length];
        const base = chosen.raciones_base || 2;
        nextPlan[slot.key] = [
          {
            uid: crypto.randomUUID(),
            recipeId: chosen.id,
            mode: 'cook',
            racionesCocinar: base,
            racionesComer: Math.min(2, base),
            completed: false,
            appliedDelta: 0
          }
        ];
        idx++;
      }
    }
    onUpdatePlan(nextPlan);
  };

  const handleClearPlan = () => {
    onUpdatePlan({});
    setCheckedItems({});
  };

  // --- LISTA DE LA COMPRA INTELIGENTE (SUMA TODOS LOS PLATOS DE CADA COMIDA) ---
  const { shoppingByCategory, coveredByPantry } = (() => {
    const aggregated = {};

    for (const slot of ALL_SLOTS) {
      const dishes = getSlotDishes(plan[slot.key]);
      for (const entry of dishes) {
        if (entry.completed || entry.mode !== 'cook') continue;

        const recipe = recipes.find((r) => r.id === entry.recipeId);
        if (!recipe) continue;

        const factor = entry.racionesCocinar / (recipe.raciones_base || 1);

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
              cantidad: 0,
              fromRecipe: true,
              pantryStatus: null
            };
          }
          aggregated[key].cantidad += (Number(ing.cantidad) || 0) * factor;
        }
      }
    }

    const toBuyList = [];
    const coveredList = [];
    const includedNames = new Set();

    for (const item of Object.values(aggregated)) {
      const clean = item.nombre.toLowerCase();
      includedNames.add(clean);
      const pantryMatch = pantryService.findMatch(item.nombre, pantryItems);

      if (pantryMatch && pantryMatch.estado === PANTRY_STATES.TENGO) {
        coveredList.push(item);
      } else {
        toBuyList.push({
          ...item,
          inPantry: !!pantryMatch,
          pantryStatus: pantryMatch ? pantryMatch.estado : null
        });
      }
    }

    for (const pItem of pantryItems) {
      if (pItem.estado === PANTRY_STATES.POCO || pItem.estado === PANTRY_STATES.AGOTADO) {
        const clean = pItem.nombre.trim().toLowerCase();
        if (!includedNames.has(clean)) {
          toBuyList.push({
            key: `pantry_${pItem.id}`,
            nombre: pItem.nombre.trim(),
            unidad: 'reponer',
            categoria: pItem.categoria || 'despensa',
            cantidad: 0,
            fromRecipe: false,
            inPantry: true,
            pantryStatus: pItem.estado
          });
        }
      }
    }

    const grouped = {};
    for (const item of toBuyList) {
      if (!grouped[item.categoria]) grouped[item.categoria] = [];
      grouped[item.categoria].push(item);
    }

    return { shoppingByCategory: grouped, coveredByPantry: coveredList };
  })();

  const handleToggleCheck = (item) => {
    const nextChecked = !checkedItems[item.key];
    setCheckedItems((prev) => ({ ...prev, [item.key]: nextChecked }));

    if (nextChecked && (item.pantryStatus === PANTRY_STATES.POCO || item.pantryStatus === PANTRY_STATES.AGOTADO)) {
      const updatedPantry = pantryService.markAsReplenished(item.nombre);
      onUpdatePantry(updatedPantry);
    }
  };

  const handleMoveToPantry = (e, item) => {
    e.stopPropagation();
    const updatedPantry = pantryService.addItem({
      nombre: item.nombre,
      categoria: item.categoria,
      estado: PANTRY_STATES.TENGO
    });
    onUpdatePantry(updatedPantry);
  };

  const formatQty = (num) => (Number.isInteger(num) ? num : Number(num.toFixed(1)));
  const hasItemsToBuy = Object.keys(shoppingByCategory).length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Columna izquierda: Calendario Semanal */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-lg text-stone-800">Planificador</h2>
            </div>

            <div className="flex rounded-lg border border-stone-200 overflow-hidden text-xs font-semibold">
              <button
                type="button"
                onClick={() => setScope('week')}
                className={`px-3 py-1.5 cursor-pointer transition-colors ${
                  scope === 'week'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-stone-600 hover:bg-stone-50'
                }`}
              >
                Semana (L-D)
              </button>
              <button
                type="button"
                onClick={() => setScope('weekend')}
                className={`px-3 py-1.5 cursor-pointer transition-colors ${
                  scope === 'weekend'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-stone-600 hover:bg-stone-50'
                }`}
              >
                Fin de semana
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleAutoSuggest}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> Rellenar huecos sugeridos
            </button>
            <button
              type="button"
              onClick={handleClearPlan}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 text-stone-500 hover:text-stone-800 text-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Limpiar semana
            </button>
          </div>

          {/* Días y comidas */}
          <div className="space-y-4">
            {visibleDays.map((day) => (
              <div
                key={day.id}
                className={`rounded-xl border p-4 space-y-3 ${
                  day.isWeekend
                    ? 'bg-emerald-50/25 border-emerald-200/70'
                    : 'bg-stone-50/70 border-stone-200/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-stone-800">{day.label}</h3>
                  {day.isWeekend && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Fin de semana
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {MEALS.map((meal) => {
                    const slotKey = `${day.id}_${meal.id}`;
                    const dishes = getSlotDishes(plan[slotKey]);

                    return (
                      <div key={slotKey} className="rounded-lg border border-stone-200 bg-white p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                            {meal.label}
                          </span>

                          {dishes.length > 0 && addingToSlot !== slotKey && (
                            <button
                              type="button"
                              onClick={() => setAddingToSlot(slotKey)}
                              className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> Añadir otro plato
                            </button>
                          )}
                        </div>

                        {/* Si no hay platos aún, selector inicial */}
                        {dishes.length === 0 && (
                          <select
                            value=""
                            onChange={(e) => addDishToSlot(slotKey, e.target.value)}
                            className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">-- Libre (elegir plato) --</option>
                            {recipes.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.titulo}
                                {(r.raciones_disponibles || 0) > 0
                                  ? ` (${r.raciones_disponibles} en nevera)`
                                  : ''}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* Lista de platos asignados a esta comida/cena */}
                        {dishes.map((entry, dishIdx) => {
                          const assignedRecipe = recipes.find((r) => r.id === entry.recipeId);
                          if (!assignedRecipe) return null;

                          const stock = assignedRecipe.raciones_disponibles || 0;
                          const sobrasCalculadas =
                            entry.mode === 'cook'
                              ? Math.max(0, entry.racionesCocinar - entry.racionesComer)
                              : 0;

                          return (
                            <div
                              key={entry.uid}
                              className={`p-2.5 rounded-lg border space-y-2 ${
                                entry.completed
                                  ? 'bg-emerald-50/60 border-emerald-200'
                                  : 'bg-stone-50/60 border-stone-200/80'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {dishes.length > 1 && (
                                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-stone-200 text-stone-700">
                                    {dishIdx + 1}º
                                  </span>
                                )}

                                <select
                                  disabled={entry.completed}
                                  value={entry.recipeId}
                                  onChange={(e) => changeDishRecipe(slotKey, entry.uid, e.target.value)}
                                  className="flex-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                  {recipes.map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.titulo}
                                      {(r.raciones_disponibles || 0) > 0
                                        ? ` (${r.raciones_disponibles} en nevera)`
                                        : ''}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  type="button"
                                  onClick={() => onSelectRecipe(assignedRecipe)}
                                  className="px-2 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-medium text-stone-600 hover:bg-stone-50 cursor-pointer"
                                >
                                  Ver
                                </button>

                                <button
                                  type="button"
                                  onClick={() => removeDishFromSlot(slotKey, entry.uid)}
                                  className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                  title="Quitar plato"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Controles de Cocinar vs Tupper */}
                              <div className="pt-1.5 border-t border-stone-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex rounded-md border border-stone-200 overflow-hidden font-medium">
                                  <button
                                    type="button"
                                    disabled={entry.completed}
                                    onClick={() => updateDishField(slotKey, entry.uid, { mode: 'cook' })}
                                    className={`flex items-center gap-1 px-2 py-1 cursor-pointer ${
                                      entry.mode === 'cook'
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-white text-stone-600'
                                    }`}
                                  >
                                    <Flame className="w-3 h-3" /> Cocinar
                                  </button>
                                  <button
                                    type="button"
                                    disabled={entry.completed}
                                    onClick={() => updateDishField(slotKey, entry.uid, { mode: 'tupper' })}
                                    className={`flex items-center gap-1 px-2 py-1 cursor-pointer ${
                                      entry.mode === 'tupper'
                                        ? 'bg-sky-600 text-white'
                                        : 'bg-white text-stone-600'
                                    }`}
                                  >
                                    <Snowflake className="w-3 h-3" /> Tupper ({stock})
                                  </button>
                                </div>

                                {entry.mode === 'cook' ? (
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-stone-200">
                                      <span className="text-stone-500">Cocinar:</span>
                                      <button
                                        type="button"
                                        disabled={entry.completed}
                                        onClick={() =>
                                          updateDishField(slotKey, entry.uid, {
                                            racionesCocinar: Math.max(1, entry.racionesCocinar - 1)
                                          })
                                        }
                                        className="px-1 font-bold cursor-pointer"
                                      >
                                        -
                                      </button>
                                      <span className="font-bold">{entry.racionesCocinar}</span>
                                      <button
                                        type="button"
                                        disabled={entry.completed}
                                        onClick={() =>
                                          updateDishField(slotKey, entry.uid, {
                                            racionesCocinar: entry.racionesCocinar + 1
                                          })
                                        }
                                        className="px-1 font-bold cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </div>

                                    <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-stone-200">
                                      <Users className="w-3 h-3 text-emerald-600" />
                                      <span>Comer:</span>
                                      <button
                                        type="button"
                                        disabled={entry.completed}
                                        onClick={() =>
                                          updateDishField(slotKey, entry.uid, {
                                            racionesComer: Math.max(1, entry.racionesComer - 1)
                                          })
                                        }
                                        className="px-1 font-bold cursor-pointer"
                                      >
                                        -
                                      </button>
                                      <span className="font-bold">{entry.racionesComer}</span>
                                      <button
                                        type="button"
                                        disabled={entry.completed}
                                        onClick={() =>
                                          updateDishField(slotKey, entry.uid, {
                                            racionesComer: Math.min(
                                              entry.racionesCocinar,
                                              entry.racionesComer + 1
                                            )
                                          })
                                        }
                                        className="px-1 font-bold cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </div>

                                    {sobrasCalculadas > 0 && !entry.completed && (
                                      <span className="text-[11px] font-medium text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
                                        +{sobrasCalculadas} nevera
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex items-center gap-1 bg-sky-50/70 px-2 py-0.5 rounded border border-sky-200">
                                      <Users className="w-3 h-3 text-sky-600" />
                                      <span>Comer:</span>
                                      <button
                                        type="button"
                                        disabled={entry.completed}
                                        onClick={() =>
                                          updateDishField(slotKey, entry.uid, {
                                            racionesComer: Math.max(1, entry.racionesComer - 1)
                                          })
                                        }
                                        className="px-1 font-bold cursor-pointer"
                                      >
                                        -
                                      </button>
                                      <span className="font-bold">{entry.racionesComer}</span>
                                      <button
                                        type="button"
                                        disabled={entry.completed}
                                        onClick={() =>
                                          updateDishField(slotKey, entry.uid, {
                                            racionesComer: entry.racionesComer + 1
                                          })
                                        }
                                        className="px-1 font-bold cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </div>
                                    <span className="text-[11px] text-sky-700 font-medium">
                                      Sin compra
                                    </span>
                                  </div>
                                )}

                                {!entry.completed ? (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleCompleted(slotKey, entry.uid)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Hecho
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleCompleted(slotKey, entry.uid)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-100 text-emerald-800 font-semibold hover:bg-emerald-200 cursor-pointer"
                                  >
                                    <Undo2 className="w-3 h-3" /> Aplicado
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Selector desplegable para añadir un 2º o 3º plato */}
                        {addingToSlot === slotKey && (
                          <div className="flex items-center gap-2 pt-1">
                            <select
                              autoFocus
                              value=""
                              onChange={(e) => addDishToSlot(slotKey, e.target.value)}
                              className="flex-1 rounded-lg border border-emerald-400 bg-emerald-50/30 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                              <option value="">-- Seleccionar plato adicional --</option>
                              {recipes.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.titulo}
                                  {(r.raciones_disponibles || 0) > 0
                                    ? ` (${r.raciones_disponibles} en nevera)`
                                    : ''}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setAddingToSlot(null)}
                              className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Columna derecha: Lista de la compra inteligente */}
      <div className="lg:col-span-5">
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4 sticky top-20">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-lg text-stone-800">Lista de la compra</h2>
            </div>
          </div>

          {!hasItemsToBuy && coveredByPantry.length === 0 ? (
            <p className="text-sm text-stone-400 py-8 text-center">
              Asigna recetas en modo <strong>Cocinar</strong> o marca básicos como agotados en <strong>Despensa</strong>.
            </p>
          ) : (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {!hasItemsToBuy && (
                <p className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-lg">
                  ¡Todo cubierto! Los ingredientes necesarios ya los tienes en tu despensa.
                </p>
              )}

              {Object.entries(shoppingByCategory).map(([category, items]) => (
                <div key={category} className="space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                    {category}
                  </h3>
                  <ul className="space-y-1.5">
                    {items.map((item) => {
                      const isChecked = !!checkedItems[item.key];
                      return (
                        <li
                          key={item.key}
                          onClick={() => handleToggleCheck(item)}
                          className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-stone-50 border-stone-100 text-stone-400 line-through'
                              : 'bg-white border-stone-200 text-stone-800 hover:bg-stone-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`flex-shrink-0 w-4 h-4 rounded flex items-center justify-center border ${
                                isChecked
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-stone-300'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3" />}
                            </span>
                            <div className="truncate">
                              <span className="capitalize font-medium">{item.nombre}</span>
                              {item.pantryStatus && (
                                <span
                                  className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                    item.pantryStatus === PANTRY_STATES.AGOTADO
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {item.pantryStatus === PANTRY_STATES.AGOTADO
                                    ? 'Agotado'
                                    : 'Queda poco'}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-semibold text-xs text-stone-500">
                              {item.unidad === 'reponer'
                                ? 'Reponer'
                                : item.unidad === 'al gusto'
                                ? 'al gusto'
                                : `${formatQty(item.cantidad)} ${item.unidad}`}
                            </span>

                            {!item.inPantry && !isChecked && (
                              <button
                                type="button"
                                onClick={(e) => handleMoveToPantry(e, item)}
                                className="p-1 rounded text-stone-400 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                                title="Tengo en casa (guardar en Despensa)"
                              >
                                <PackagePlus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}

              {coveredByPantry.length > 0 && (
                <div className="pt-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setShowCoveredPantry(!showCoveredPantry)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-emerald-700 hover:text-emerald-800 py-1 cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <PackageCheck className="w-4 h-4" />
                      Ya tienes en despensa ({coveredByPantry.length})
                    </span>
                    {showCoveredPantry ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {showCoveredPantry && (
                    <ul className="mt-2 space-y-1 text-xs text-stone-500 bg-stone-50 rounded-lg p-2.5">
                      {coveredByPantry.map((item) => (
                        <li key={item.key} className="flex justify-between capitalize py-0.5">
                          <span>{item.nombre}</span>
                          <span>
                            {item.unidad === 'al gusto'
                              ? 'al gusto'
                              : `${formatQty(item.cantidad)} ${item.unidad}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}