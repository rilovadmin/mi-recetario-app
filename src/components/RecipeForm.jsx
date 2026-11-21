import { useState } from 'react';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { createEmptyRecipe } from '../models/recipeModel';

const TEMPORADAS = ['todas', 'primavera', 'verano', 'otoño', 'invierno'];
const UNIDADES = ['ud', 'g', 'kg', 'ml', 'l', 'cda', 'cdta', 'al gusto'];
const CATEGORIAS = [
  'verduras', 'frutas', 'carniceria', 'pescaderia',
  'lacteos', 'legumbres', 'despensa', 'congelados', 'otros'
];

export default function RecipeForm({ initialRecipe, onSave, onCancel }) {
  const [recipe, setRecipe] = useState(() => initialRecipe || createEmptyRecipe());
  const [tagsInput, setTagsInput] = useState(() => (initialRecipe?.etiquetas || []).join(', '));

  const toggleTemporada = (temp) => {
    if (temp === 'todas') {
      setRecipe({ ...recipe, temporada: ['todas'] });
      return;
    }
    const sinTodas = recipe.temporada.filter((t) => t !== 'todas');
    const existe = sinTodas.includes(temp);
    const nuevas = existe ? sinTodas.filter((t) => t !== temp) : [...sinTodas, temp];
    setRecipe({ ...recipe, temporada: nuevas.length ? nuevas : ['todas'] });
  };

  const updateIngrediente = (index, field, value) => {
    const nuevos = [...recipe.ingredientes];
    nuevos[index] = { ...nuevos[index], [field]: value };
    setRecipe({ ...recipe, ingredientes: nuevos });
  };

  const addIngrediente = () => {
    setRecipe({
      ...recipe,
      ingredientes: [...recipe.ingredientes, { nombre: '', cantidad: 1, unidad: 'ud', categoria: 'despensa' }]
    });
  };

  const removeIngrediente = (index) => {
    if (recipe.ingredientes.length === 1) return;
    setRecipe({
      ...recipe,
      ingredientes: recipe.ingredientes.filter((_, i) => i !== index)
    });
  };

  const updatePaso = (index, value) => {
    const nuevos = [...recipe.pasos];
    nuevos[index] = value;
    setRecipe({ ...recipe, pasos: nuevos });
  };

  const addPaso = () => {
    setRecipe({ ...recipe, pasos: [...recipe.pasos, ''] });
  };

  const removePaso = (index) => {
    if (recipe.pasos.length === 1) return;
    setRecipe({ ...recipe, pasos: recipe.pasos.filter((_, i) => i !== index) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!recipe.titulo.trim()) return;

    const etiquetasLimpias = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const ingredientesLimpios = recipe.ingredientes
      .filter((ing) => ing.nombre.trim() !== '')
      .map((ing) => ({ ...ing, cantidad: Number(ing.cantidad) || 0 }));

    const pasosLimpios = recipe.pasos.filter((p) => p.trim() !== '');

    onSave({
      ...recipe,
      titulo: recipe.titulo.trim(),
      tiempo_minutos: Number(recipe.tiempo_minutos) || 15,
      raciones_base: Number(recipe.raciones_base) || 1,
      etiquetas: etiquetasLimpias,
      ingredientes: ingredientesLimpios,
      pasos: pasosLimpios
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-stone-100 pb-4">
        <button type="button" onClick={onCancel} className="flex items-center gap-2 text-stone-600 hover:text-stone-900 cursor-pointer">
          <ArrowLeft className="w-5 h-5" /> Volver
        </button>
        <h2 className="text-xl font-bold text-stone-800">
          {initialRecipe ? 'Editar receta' : 'Nueva receta'}
        </h2>
        <div className="w-16" />
      </div>

      {/* Datos básicos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-stone-700 mb-1">Nombre del plato *</label>
          <input
            type="text"
            required
            placeholder="Ej: Lentejas estofadas"
            value={recipe.titulo}
            onChange={(e) => setRecipe({ ...recipe, titulo: e.target.value })}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Tiempo (min)</label>
          <input
            type="number"
            min="1"
            value={recipe.tiempo_minutos}
            onChange={(e) => setRecipe({ ...recipe, tiempo_minutos: e.target.value })}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Raciones base</label>
          <input
            type="number"
            min="1"
            value={recipe.raciones_base}
            onChange={(e) => setRecipe({ ...recipe, raciones_base: e.target.value })}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Temporada y Etiquetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Temporada ideal</label>
          <div className="flex flex-wrap gap-2">
            {TEMPORADAS.map((temp) => (
              <button
                key={temp}
                type="button"
                onClick={() => toggleTemporada(temp)}
                className={`px-3 py-1 rounded-full text-sm capitalize cursor-pointer border ${
                  recipe.temporada.includes(temp)
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {temp}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Etiquetas (separadas por comas)</label>
          <input
            type="text"
            placeholder="Ej: cuchara, rápida, batch-cooking"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Ingredientes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-stone-800">Ingredientes</label>
          <button type="button" onClick={addIngrediente} className="text-sm text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1 cursor-pointer">
            <Plus className="w-4 h-4" /> Añadir ingrediente
          </button>
        </div>
        {recipe.ingredientes.map((ing, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 items-center">
            <input
              type="number"
              step="any"
              placeholder="Cant."
              value={ing.cantidad}
              onChange={(e) => updateIngrediente(idx, 'cantidad', e.target.value)}
              className="col-span-2 rounded-lg border border-stone-300 px-2 py-2 text-sm"
            />
            <select
              value={ing.unidad}
              onChange={(e) => updateIngrediente(idx, 'unidad', e.target.value)}
              className="col-span-2 rounded-lg border border-stone-300 px-2 py-2 text-sm bg-white"
            >
              {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <input
              type="text"
              placeholder="Ingrediente (ej: zanahoria)"
              value={ing.nombre}
              onChange={(e) => updateIngrediente(idx, 'nombre', e.target.value)}
              className="col-span-4 rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <select
              value={ing.categoria}
              onChange={(e) => updateIngrediente(idx, 'categoria', e.target.value)}
              className="col-span-3 rounded-lg border border-stone-300 px-2 py-2 text-sm bg-white capitalize"
            >
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button type="button" onClick={() => removeIngrediente(idx)} className="col-span-1 text-stone-400 hover:text-red-500 flex justify-center cursor-pointer">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Pasos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-stone-800">Preparación paso a paso</label>
          <button type="button" onClick={addPaso} className="text-sm text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1 cursor-pointer">
            <Plus className="w-4 h-4" /> Añadir paso
          </button>
        </div>
        {recipe.pasos.map((paso, idx) => (
          <div key={idx} className="flex gap-2 items-start">
            <span className="mt-2 text-xs font-bold text-stone-400 w-5">{idx + 1}.</span>
            <textarea
              rows="2"
              placeholder={`Describe el paso ${idx + 1}...`}
              value={paso}
              onChange={(e) => updatePaso(idx, e.target.value)}
              className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button type="button" onClick={() => removePaso(idx)} className="mt-2 text-stone-400 hover:text-red-500 cursor-pointer">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 cursor-pointer">
          Cancelar
        </button>
        <button type="submit" className="px-6 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 cursor-pointer">
          Guardar receta
        </button>
      </div>
    </form>
  );
}