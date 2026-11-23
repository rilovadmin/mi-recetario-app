export const createEmptyRecipe = () => ({
  id: crypto.randomUUID(),
  schema_version: 2,
  titulo: '',
  fecha_creacion: new Date().toISOString().split('T')[0],
  historial_cocinado: [],
  tiempo_minutos: 30,
  temporada: ['todas'],
  raciones_base: 2,
  raciones_disponibles: 0, // Raciones ya cocinadas guardadas en frigorífico/congelador
  ingredientes: [
    { nombre: '', cantidad: 1, unidad: 'ud', categoria: 'despensa' }
  ],
  pasos: [''],
  etiquetas: [],
  extras: {}
});

export const normalizeRecipe = (recipe) => ({
  ...recipe,
  raciones_base: Number(recipe.raciones_base) || 2,
  raciones_disponibles: Math.max(0, Number(recipe.raciones_disponibles) || 0),
  historial_cocinado: Array.isArray(recipe.historial_cocinado) ? recipe.historial_cocinado : []
});