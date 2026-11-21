import { useState, useEffect } from 'react';
import {
  ArrowLeft, Clock, Users, Edit2, Trash2,
  CheckCircle2, Calendar, Flame, Check, Sun
} from 'lucide-react';

export default function RecipeDetail({ recipe, onBack, onEdit, onDelete, onMarkCooked }) {
  const [raciones, setRaciones] = useState(recipe.raciones_base || 2);
  const [cookingMode, setCookingMode] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [checkedIngs, setCheckedIngs] = useState({});
  const [checkedSteps, setCheckedSteps] = useState({});

  const factor = raciones / (recipe.raciones_base || 1);

  // Mantener pantalla encendida cuando el Modo Cocina está activo
  useEffect(() => {
    let wakeLock = null;

    const requestWakeLock = async () => {
      if (!cookingMode || !('wakeLock' in navigator)) return;
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        setWakeLockActive(true);
        wakeLock.addEventListener('release', () => setWakeLockActive(false));
      } catch {
        setWakeLockActive(false);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && cookingMode) {
        requestWakeLock();
      }
    };

    if (cookingMode) {
      requestWakeLock();
      document.addEventListener('visibilitychange', handleVisibility);
    } else {
      setWakeLockActive(false);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, [cookingMode]);

  const formatCantidad = (cant) => {
    if (!cant) return '';
    const escalada = cant * factor;
    return Number.isInteger(escalada) ? escalada : escalada.toFixed(1).replace('.0', '');
  };

  const toggleIng = (idx) => {
    setCheckedIngs((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleStep = (idx) => {
    setCheckedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const ultimaVez = recipe.historial_cocinado?.length
    ? recipe.historial_cocinado[recipe.historial_cocinado.length - 1]
    : 'Nunca cocinada aún';

  return (
    <div
      className={`mx-auto rounded-2xl shadow-sm border transition-all space-y-6 ${
        cookingMode
          ? 'max-w-4xl bg-amber-50/40 border-amber-300 p-6 md:p-8'
          : 'max-w-3xl bg-white border-stone-200 p-6'
      }`}
    >
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/70 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-stone-600 hover:text-stone-900 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" /> Volver
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCookingMode(!cookingMode)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold border cursor-pointer transition-colors ${
              cookingMode
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Flame className="w-4 h-4" />
            {cookingMode ? 'Salir Modo Cocina' : 'Modo Cocina'}
          </button>

          <button
            onClick={() => onMarkCooked(recipe.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm font-medium cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" /> ¡Cocinada hoy!
          </button>

          {!cookingMode && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Aviso de pantalla activa en Modo Cocina */}
      {cookingMode && (
        <div className="flex items-center justify-between bg-amber-100/80 text-amber-900 px-4 py-2.5 rounded-xl text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <Sun className="w-4 h-4 text-amber-600" />
            {wakeLockActive
              ? 'Pantalla bloqueada para que no se apague mientras cocinas.'
              : 'Modo lectura ampliada activo. Toca los ingredientes o pasos para marcarlos.'}
          </span>
        </div>
      )}

      {/* Título y metadatos */}
      <div>
        <h1 className={`${cookingMode ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl'} font-bold text-stone-900`}>
          {recipe.titulo}
        </h1>
        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-stone-600">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-emerald-600" /> {recipe.tiempo_minutos} min
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-emerald-600" /> Última vez: {ultimaVez}
          </span>
          <span className="capitalize text-stone-500">Temporada: {recipe.temporada.join(', ')}</span>
        </div>
      </div>

      {/* Escalador de raciones + Ingredientes */}
      <div className="bg-white rounded-xl border border-stone-200/80 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className={`font-bold text-stone-800 ${cookingMode ? 'text-xl' : 'text-base'}`}>
            Ingredientes
          </h2>
          <div className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200">
            <Users className="w-4 h-4 text-emerald-600" />
            <button
              onClick={() => setRaciones(Math.max(1, raciones - 1))}
              className="px-2 font-bold text-stone-600 hover:text-stone-900 cursor-pointer"
            >
              -
            </button>
            <span className="text-sm font-semibold w-16 text-center">{raciones} rac.</span>
            <button
              onClick={() => setRaciones(raciones + 1)}
              className="px-2 font-bold text-stone-600 hover:text-stone-900 cursor-pointer"
            >
              +
            </button>
          </div>
        </div>

        <ul className="divide-y divide-stone-100">
          {recipe.ingredientes.map((ing, idx) => {
            const done = !!checkedIngs[idx];
            return (
              <li
                key={idx}
                onClick={() => cookingMode && toggleIng(idx)}
                className={`py-2.5 flex items-center justify-between transition-opacity ${
                  cookingMode ? 'text-lg cursor-pointer select-none' : 'text-sm'
                } ${done ? 'opacity-40 line-through' : ''}`}
              >
                <div className="flex items-center gap-3">
                  {cookingMode && (
                    <span
                      className={`w-5 h-5 rounded flex items-center justify-center border ${
                        done ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-stone-300'
                      }`}
                    >
                      {done && <Check className="w-3.5 h-3.5" />}
                    </span>
                  )}
                  <span className="text-stone-800 font-medium capitalize">{ing.nombre}</span>
                </div>
                <span className="text-stone-700 font-bold">
                  {ing.unidad === 'al gusto' ? 'al gusto' : `${formatCantidad(ing.cantidad)} ${ing.unidad}`}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Pasos */}
      <div className="space-y-4">
        <h2 className={`font-bold text-stone-800 ${cookingMode ? 'text-xl' : 'text-lg'}`}>
          Preparación
        </h2>
        <ol className="space-y-4">
          {recipe.pasos.map((paso, idx) => {
            const done = !!checkedSteps[idx];
            return (
              <li
                key={idx}
                onClick={() => cookingMode && toggleStep(idx)}
                className={`flex gap-4 rounded-xl transition-all ${
                  cookingMode
                    ? 'p-4 bg-white border border-stone-200 cursor-pointer select-none shadow-xs'
                    : ''
                } ${done ? 'opacity-45' : ''}`}
              >
                <span
                  className={`flex-shrink-0 rounded-full font-bold flex items-center justify-center ${
                    cookingMode ? 'w-9 h-9 text-base' : 'w-7 h-7 text-sm'
                  } ${
                    done
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {done ? <Check className="w-4 h-4" /> : idx + 1}
                </span>
                <p
                  className={`text-stone-800 leading-relaxed ${
                    cookingMode ? 'text-lg md:text-xl pt-0.5' : 'pt-0.5'
                  } ${done ? 'line-through' : ''}`}
                >
                  {paso}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}