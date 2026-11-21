export function getCurrentSeason() {
  const month = new Date().getMonth(); // 0 = Enero ... 11 = Diciembre
  if (month === 11 || month <= 1) return 'invierno';
  if (month >= 2 && month <= 4) return 'primavera';
  if (month >= 5 && month <= 7) return 'verano';
  return 'otoño';
}

export function getDaysSinceLastCooked(recipe) {
  const history = recipe.historial_cocinado;
  if (!history || history.length === 0) return 999;

  const sorted = [...history].sort();
  const lastDate = new Date(sorted[sorted.length - 1]);
  const today = new Date();
  const diffMs = today.setHours(0, 0, 0, 0) - lastDate.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function getRecommendedRecipes(recipes, { pantryText = '', maxTime = 0, onlyCurrentSeason = false } = {}) {
  const currentSeason = getCurrentSeason();
  const pantryTerms = pantryText
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return recipes
    .filter((recipe) => {
      if (maxTime > 0 && (recipe.tiempo_minutos || 0) > maxTime) return false;

      if (onlyCurrentSeason) {
        const temps = recipe.temporada || ['todas'];
        if (!temps.includes('todas') && !temps.includes(currentSeason)) return false;
      }

      return true;
    })
    .map((recipe) => {
      const daysAgo = getDaysSinceLastCooked(recipe);
      const ings = recipe.ingredientes || [];
      let matchPercent = null;
      let matchedCount = 0;

      if (pantryTerms.length > 0 && ings.length > 0) {
        matchedCount = ings.filter((ing) => {
          const ingName = ing.nombre.toLowerCase();
          return pantryTerms.some((term) => ingName.includes(term) || term.includes(ingName));
        }).length;
        matchPercent = Math.round((matchedCount / ings.length) * 100);
      }

      return {
        ...recipe,
        _daysAgo: daysAgo,
        _matchPercent: matchPercent,
        _matchedCount: matchedCount
      };
    })
    .filter((recipe) => {
      // Si el usuario escribió ingredientes, mostrar solo recetas que usen al menos uno
      if (pantryTerms.length > 0) return recipe._matchedCount > 0;
      return true;
    })
    .sort((a, b) => {
      // Prioridad 1: mayor coincidencia de ingredientes si hay filtro de despensa
      if (pantryTerms.length > 0 && b._matchPercent !== a._matchPercent) {
        return b._matchPercent - a._matchPercent;
      }
      // Prioridad 2: recetas que hace más tiempo que no se cocinan
      return b._daysAgo - a._daysAgo;
    });
}