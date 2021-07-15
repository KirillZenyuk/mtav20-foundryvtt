/* global CONFIG, Handlebars, Hooks, Actors, ActorSheet, ChatMessage, Items, ItemSheet, Macro, game, ui */

import {preloadHandlebarsTemplates} from './templates.js'
import {MageActor} from './actor/actor.js'
import {MageActorSheet} from './actor/actor-sheet.js'
import {MageItem} from './item/item.js'
import {MageItemSheet} from './item/item-sheet.js'

Hooks.once('init', async function () {
    console.log('MAGE: THE ASCENSION | System initializing')

    game.mtav20 = {
        MageActor,
        MageItem,
        rollItemMacro
    }

    /**
     * Set an initiative formula for the system
     * @type {String}
     */
    CONFIG.Combat.initiative = {
        formula: '1d10'
    }

    // Define custom Entity classes
    CONFIG.Actor.documentClass = MageActor
    CONFIG.Item.documentClass = MageItem

    // Register sheet application classes
    Actors.unregisterSheet('core', ActorSheet)
    Actors.registerSheet('mtav20', MageActorSheet, {makeDefault: true})
    Items.unregisterSheet('core', ItemSheet)
    Items.registerSheet('mtav20', MageItemSheet, {makeDefault: true})

    preloadHandlebarsTemplates()

    // Register Handlebars helpers
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

    Handlebars.registerHelper('generateFeatureLabel', function (str) {
        return (str === 'merit' ? 'MTAv20.Merit' : 'MTAv20.Flaw')
    })

    Handlebars.registerHelper('generateAbilityLabel', function (str) {
        return 'MTAv20.'.concat(str.split(' ').flatMap(word => capitalize(word)).join(''))
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
})

Hooks.once('ready', async function () {
    // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
    Hooks.on('hotbarDrop', (bar, data, slot) => createMacro(data, slot))
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
async function createMacro(data, slot) {
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
            flags: {'MTAv20.itemMacro': true}
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
function rollItemMacro(itemName) {
    const speaker = ChatMessage.getSpeaker()
    let actor
    if (speaker.token) actor = game.actors.tokens[speaker.token]
    if (!actor) actor = game.actors.get(speaker.actor)
    const item = actor ? actor.items.find(i => i.name === itemName) : null
    if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemName}`)

    // Trigger the item roll
    return item.roll()
}
