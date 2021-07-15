/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
  console.log('MAGE: THE ASCENSION | Loading subroutines')
  // Define template paths to load
  const templatePaths = [
    // Item Sheet Partials
    'systems/mtav20/templates/item/parts/abilities.html',
    'systems/mtav20/templates/item/parts/attributes.html'
  ]

  /* Load the template parts
     That function is part of foundry, not founding it here is normal
  */
  return loadTemplates(templatePaths) // eslint-disable-line no-undef
}
