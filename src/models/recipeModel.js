export const createEmptyRecipe = () => ({
  id: crypto.randomUUID(),
  schema_version: 1,
  titulo: '',
  fecha_creacion: new Date().toISOString().split('T')[0],
  historial_cocinado: [],
  tiempo_minutos: 30,
  temporada: ['todas'],
  raciones_base: 2,
  ingredientes: [
    { nombre: '', cantidad: 1, unidad: 'ud', categoria: 'despensa' }
  ],
  pasos: [''],
  etiquetas: [],
  extras: {}
});