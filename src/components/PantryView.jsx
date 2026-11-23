import { useState } from 'react';
import { Package, Plus, Trash2, Search } from 'lucide-react';
import { pantryService, PANTRY_STATES } from '../services/pantryService';

const CATEGORIAS = [
  'despensa', 'verduras', 'frutas', 'carniceria', 'pescaderia',
  'lacteos', 'legumbres', 'congelados', 'otros'
];

export default function PantryView({ items, onUpdatePantry }) {
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('despensa');
  const [estadoInicial, setEstadoInicial] = useState(PANTRY_STATES.TENGO);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'low' | 'tengo'
  const [search, setSearch] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    const updated = pantryService.addItem({
      nombre,
      categoria,
      estado: estadoInicial
    });
    onUpdatePantry(updated);
    setNombre('');
  };

  const handleStatusChange = (id, newStatus) => {
    const updated = pantryService.updateStatus(id, newStatus);
    onUpdatePantry(updated);
  };

  const handleDelete = (id) => {
    const updated = pantryService.removeItem(id);
    onUpdatePantry(updated);
  };

  const lowCount = items.filter(
    (i) => i.estado === PANTRY_STATES.POCO || i.estado === PANTRY_STATES.AGOTADO
  ).length;

  const filteredItems = items
    .filter((item) => {
      if (filterStatus === 'low') {
        return item.estado === PANTRY_STATES.POCO || item.estado === PANTRY_STATES.AGOTADO;
      }
      if (filterStatus === 'tengo') {
        return item.estado === PANTRY_STATES.TENGO;
      }
      return true;
    })
    .filter((item) => item.nombre.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const order = { [PANTRY_STATES.AGOTADO]: 0, [PANTRY_STATES.POCO]: 1, [PANTRY_STATES.TENGO]: 2 };
      return order[a.estado] - order[b.estado];
    });

  return (
    <div className="space-y-6">
      {/* Formulario para añadir básico */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-lg text-stone-800">Despensa e Imprescindibles</h2>
          </div>
          {lowCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
              {lowCount} por reponer
            </span>
          )}
        </div>

        <p className="text-xs text-stone-500">
          Los ingredientes en estado <strong>Tengo</strong> no se pedirán en la lista de la compra aunque los use una receta. Cuando los marques como <strong>Queda poco</strong> o <strong>Agotado</strong>, aparecerán automáticamente para comprar.
        </p>

        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <input
            type="text"
            required
            placeholder="Ej: Aceite de oliva, pimienta negra, sal..."
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="sm:col-span-5 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="sm:col-span-3 rounded-lg border border-stone-300 px-2.5 py-2 text-sm bg-white capitalize focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={estadoInicial}
            onChange={(e) => setEstadoInicial(e.target.value)}
            className="sm:col-span-2 rounded-lg border border-stone-300 px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value={PANTRY_STATES.TENGO}>Tengo</option>
            <option value={PANTRY_STATES.POCO}>Queda poco</option>
            <option value={PANTRY_STATES.AGOTADO}>Agotado</option>
          </select>

          <button
            type="submit"
            className="sm:col-span-2 flex items-center justify-center gap-1 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Añadir
          </button>
        </form>
      </div>

      {/* Filtros y buscador */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border ${
              filterStatus === 'all'
                ? 'bg-stone-800 text-white border-stone-800'
                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
            }`}
          >
            Todos ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('low')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border ${
              filterStatus === 'low'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
            }`}
          >
            Para comprar ({lowCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('tengo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border ${
              filterStatus === 'tengo'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
            }`}
          >
            En casa ({items.length - lowCount})
          </button>
        </div>

        <div className="relative sm:w-64">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filtrar despensa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white rounded-lg border border-stone-200 pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Listado de ingredientes */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-stone-200">
          <Package className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <p className="text-stone-600 font-medium text-sm">No hay ingredientes en esta vista</p>
          <p className="text-stone-400 text-xs mt-1">Añade arriba tus básicos habituales (sal, aceite, especias, arroz...).</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 overflow-hidden">
          {filteredItems.map((item) => (
            <div key={item.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-stone-800 capitalize">{item.nombre}</p>
                <span className="text-xs text-stone-400 capitalize">{item.categoria}</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-stone-200 overflow-hidden text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(item.id, PANTRY_STATES.TENGO)}
                    className={`px-2.5 py-1.5 cursor-pointer transition-colors ${
                      item.estado === PANTRY_STATES.TENGO
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    Tengo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(item.id, PANTRY_STATES.POCO)}
                    className={`px-2.5 py-1.5 border-x border-stone-200 cursor-pointer transition-colors ${
                      item.estado === PANTRY_STATES.POCO
                        ? 'bg-amber-500 text-white'
                        : 'bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    Queda poco
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(item.id, PANTRY_STATES.AGOTADO)}
                    className={`px-2.5 py-1.5 cursor-pointer transition-colors ${
                      item.estado === PANTRY_STATES.AGOTADO
                        ? 'bg-red-600 text-white'
                        : 'bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    Agotado
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 text-stone-400 hover:text-red-500 cursor-pointer"
                  title="Eliminar de despensa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}