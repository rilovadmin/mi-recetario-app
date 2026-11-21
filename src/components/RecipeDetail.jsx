import { useState } from 'react';
import { ArrowLeft, Clock, Users, Edit2, Trash2, CheckCircle2, Calendar } from 'lucide-react';

export default function RecipeDetail({ recipe, onBack, onEdit, onDelete, onMarkCooked }) {
  const [raciones, setRaciones] = useState(recipe.raciones_base || 2);
  const factor = raciones / (recipe.raciones_base || 1);

  const formatCantidad = (cant) => {
    if (!cant) return '';
    const escalada = cant * factor;
    return Number.isInteger(escalada) ? escalada : escalada.toFixed(1).replace('.0', '');
  };

  const ultimaVez = recipe.historial_cocinado?.length
    ? recipe.historial_cocinado[recipe.historial_cocinado.length - 1]
    : 'Nunca cocinada aún';

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-6">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-4">
        <button onClick={onBack} className="flex items-center gap-2 text-stone-600 hover:text-stone-900 cursor-pointer">
          <ArrowLeft className="w-5 h-5" /> Volver al recetario
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onMarkCooked(recipe.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm font-medium cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" /> ¡Cocinada hoy!
          </button>
          <button
            onClick={() => onEdit(recipe)}
            className="p-2 rounded-lg text-stone-600 hover:bg-stone-100 cursor-pointer"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (window.confirm('¿Seguro que quieres borrar esta receta?')) onDelete(recipe.id);
            }}
            className="p-2 rounded-lg text-red-500 hover:bg-red-50 cursor-pointer"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Título y metadatos */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-stone-900">{recipe.titulo}</h1>
        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-stone-600">
          <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-emerald-600" /> {recipe.tiempo_minutos} min</span>
          <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-emerald-600" /> Última vez: {ultimaVez}</span>
          <span className="capitalize text-stone-500">Temporada: {recipe.temporada.join(', ')}</span>
        </div>
        {recipe.etiquetas?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {recipe.etiquetas.map((tag) => (
              <span key={tag} className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-xs">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Escalador de raciones + Ingredientes */}
      <div className="bg-stone-50 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-stone-800">Ingredientes</h2>
          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-stone-200">
            <Users className="w-4 h-4 text-emerald-600" />
            <button onClick={() => setRaciones(Math.max(1, raciones - 1))} className="px-2 font-bold text-stone-600 hover:text-stone-900 cursor-pointer">-</button>
            <span className="text-sm font-semibold w-16 text-center">{raciones} rac.</span>
            <button onClick={() => setRaciones(raciones + 1)} className="px-2 font-bold text-stone-600 hover:text-stone-900 cursor-pointer">+</button>
          </div>
        </div>
        <ul className="divide-y divide-stone-200/70">
          {recipe.ingredientes.map((ing, idx) => (
            <li key={idx} className="py-2 flex justify-between text-sm">
              <span className="text-stone-800 font-medium capitalize">{ing.nombre}</span>
              <span className="text-stone-600 font-semibold">
                {ing.unidad === 'al gusto' ? 'al gusto' : `${formatCantidad(ing.cantidad)} ${ing.unidad}`}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Pasos */}
      <div className="space-y-4">
        <h2 className="font-bold text-stone-800 text-lg">Preparación</h2>
        <ol className="space-y-4">
          {recipe.pasos.map((paso, idx) => (
            <li key={idx} className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center">
                {idx + 1}
              </span>
              <p className="text-stone-700 leading-relaxed pt-0.5">{paso}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}