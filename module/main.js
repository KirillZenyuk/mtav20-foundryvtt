/* global CONFIG, Handlebars, Hooks, Actors, ActorSheet, ChatMessage, Items, ItemSheet, Macro, game, ui */

// Import Modules
import { preloadHandlebarsTemplates } from './templates.js'
import { MageActor } from './actor/actor.js'
import { MageActorSheet } from './actor/mtav20-sheet.js'
import { MageItem } from './item/item.js'
import { MageItemSheet } from './item/item-sheet.js'
import { VampireDie, VampireHungerDie } from './dice/dice.js'

Hooks.once('init', async function () {
  console.log('Initializing Schrecknet...')

  game.MTAv20 = {
    MageActor,
    MageItem,
    rollItemMacro
  }

  /**
     * Set an initiative formula for the system
     * @type {String}
     */
  CONFIG.Combat.initiative = {
    formula: '1d20'
  }

  // Define custom Entity classes
  CONFIG.Actor.documentClass = MageActor
  CONFIG.Item.documentClass = MageItem
  CONFIG.Dice.terms.v = VampireDie
  CONFIG.Dice.terms.h = VampireHungerDie

  // Register sheet application classes
  Actors.unregisterSheet('core', ActorSheet)
  Actors.registerSheet('MTAv20', MageActorSheet, { makeDefault: true })
  Items.unregisterSheet('core', ItemSheet)
  Items.registerSheet('MTAv20', MageItemSheet, { makeDefault: true })

  preloadHandlebarsTemplates()

  // If you need to add Handlebars helpers, here are a few useful examples:
  Handlebars.registerHelper('concat', function () {
    let outStr = ''
    for (const arg in arguments) {
      if (typeof arguments[arg] !== 'object') {
        outStr += arguments[arg]
      }
    }
    return outStr
  })

  Handlebars.registerHelper('or', function (bool1, bool2) {
    return bool1 || bool2
  })

  Handlebars.registerHelper('and', function (bool1, bool2) {
    return bool1 && bool2
  })

  Handlebars.registerHelper('toLowerCase', function (str) {
    return str.toLowerCase()
  })

  Handlebars.registerHelper('toUpperCaseFirstLetter', function (str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
  })

  const capitalize = (s) => {
    if (typeof s !== 'string') return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
  }

  // TODO: There's gotta be a better way lol
  Handlebars.registerHelper('generateFeatureLabel', function (str) {
    return (str === 'merit' ? 'MTAv20.Merit' : 'MTAv20.Flaw')
  })

  Handlebars.registerHelper('generateAbilityLabel', function (str) {
    return 'MTAv20.'.concat(str.split(' ').flatMap(word => capitalize(word)).join(''))
  })

  // TODO: there exist math helpers for handlebars
  Handlebars.registerHelper('frenzy', function (willpowerMax, willpowerAgg, willpowerSup, humanity) {
    return ((willpowerMax - willpowerAgg - willpowerSup) + Math.floor(humanity / 3))
  })

  Handlebars.registerHelper('perception', function (percept, alert) {
    let total = percept + alert;

    return (total)
  })

  // TODO: there exist math helpers for handlebars
  Handlebars.registerHelper('remorse', function (humanity, stain) {
    return (10 - humanity - stain)
  })

  Handlebars.registerHelper('numLoop', function (num, options) {
    let ret = ''

    for (let i = 0, j = num; i < j; i++) {
      ret = ret + options.fn(i)
    }

    return ret
  })

  Handlebars.registerHelper('willpowerRollValue', function (willpower) {
    return (willpower.max - willpower.spent)
  })

  Handlebars.registerHelper('getDisciplineName', function (key, roll = false) {
    const disciplines = {
      animalism: 'MTAv20.Animalism',
      auspex: 'MTAv20.Auspex',
      celerity: 'MTAv20.Celerity',
      dominate: 'MTAv20.Dominate',
      fortitude: 'MTAv20.Fortitude',
      obfuscate: 'MTAv20.Obfuscate',
      potence: 'MTAv20.Potence',
      presence: 'MTAv20.Presence',
      protean: 'MTAv20.Protean',
      sorcery: 'MTAv20.BloodSorcery',
      oblivion: 'MTAv20.Oblivion',
      alchemy: 'MTAv20.ThinBloodAlchemy',
      rituals: 'MTAv20.Rituals',
      ceremonies: 'MTAv20.Ceremonies'
    }
    if (roll) {
      if (key === 'rituals') {
        return disciplines.sorcery
      } else if (key === 'ceremonies') {
        return disciplines.oblivion
      }
    }
    return disciplines[key]
  })
})

Hooks.once('ready', async function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on('hotbarDrop', (bar, data, slot) => createVampireMacro(data, slot))
})

Hooks.once('diceSoNiceReady', (dice3d) => {
  dice3d.addSystem({ id: 'MTAv20', name: 'VtM5e' }, true)
  dice3d.addDicePreset({
    type: 'dv',
    labels: [
      'systems/MTAv20/assets/images/normal-fail-dsn.png',
      'systems/MTAv20/assets/images/normal-fail-dsn.png',
      'systems/MTAv20/assets/images/normal-fail-dsn.png',
      'systems/MTAv20/assets/images/normal-fail-dsn.png',
      'systems/MTAv20/assets/images/normal-fail-dsn.png',
      'systems/MTAv20/assets/images/normal-success-dsn.png',
      'systems/MTAv20/assets/images/normal-success-dsn.png',
      'systems/MTAv20/assets/images/normal-success-dsn.png',
      'systems/MTAv20/assets/images/normal-success-dsn.png',
      'systems/MTAv20/assets/images/normal-crit-dsn.png'
    ],
    colorset: 'white',
    fontScale: 0.5,
    system: 'MTAv20'
  })
  dice3d.addDicePreset({
    type: 'dh',
    labels: [
      'systems/MTAv20/assets/images/bestial-fail-dsn.png',
      'systems/MTAv20/assets/images/red-fail-dsn.png',
      'systems/MTAv20/assets/images/red-fail-dsn.png',
      'systems/MTAv20/assets/images/red-fail-dsn.png',
      'systems/MTAv20/assets/images/red-fail-dsn.png',
      'systems/MTAv20/assets/images/red-success-dsn.png',
      'systems/MTAv20/assets/images/red-success-dsn.png',
      'systems/MTAv20/assets/images/red-success-dsn.png',
      'systems/MTAv20/assets/images/red-success-dsn.png',
      'systems/MTAv20/assets/images/red-crit-dsn.png'
    ],
    colorset: 'black',
    system: 'MTAv20'
  })
})

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createVampireMacro (data, slot) {
  if (data.type !== 'Item') return
  if (!('data' in data)) return ui.notifications.warn('You can only create macro buttons for owned Items')
  const item = data.data

  // Create the macro command
  const command = `game.MTAv20.rollItemMacro("${item.name}");`
  let macro = game.macros.entities.find(m => (m.name === item.name) && (m.command === command))
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: 'script',
      img: item.img,
      command: command,
      flags: { 'MTAv20.itemMacro': true }
    })
  }
  game.user.assignHotbarMacro(macro, slot)
  return false
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemName
 * @return {Promise}
 */
function rollItemMacro (itemName) {
  const speaker = ChatMessage.getSpeaker()
  let actor
  if (speaker.token) actor = game.actors.tokens[speaker.token]
  if (!actor) actor = game.actors.get(speaker.actor)
  const item = actor ? actor.items.find(i => i.name === itemName) : null
  if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemName}`)

  // Trigger the item roll
  return item.roll()
}
