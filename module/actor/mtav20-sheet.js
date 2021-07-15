/* global DEFAULT_TOKEN, ActorSheet, ChatMessage, Dialog, Roll, duplicate, game, mergeObject */

/**
 * Extend the basic ActorSheet
 * @extends {ActorSheet}
 */
export class MageActorSheet extends ActorSheet {

    /********************
     * BASE
     ********************/

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ['MTAv20', 'sheet', 'actor'],
            template: 'systems/mtav20/templates/actor/mtav20-sheet.html',
            width: 1000,
            height: 900,
            tabs: [{navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'stats'}]
        })
    }

    /** @override */
    getData() {
        const data = super.getData()
        data.dtypes = ['String', 'Number', 'Boolean']

        if (this.actor.data.type === 'character') {
            this._prepareCharacterAttributes(data)
            this._prepareCharacterItems(data)
        }

        return data
    }

    /**
     * Set default value 1 to all Attributes for new actor
     *
     * @param {Object} sheetData The actor to prepare
     *
     * @return {undefined}
     */
    _prepareCharacterAttributes(sheetData) {
        const characterAttributes = sheetData.data.data.attributes

        Object.values(characterAttributes).forEach(attribute => {
            if (attribute.value === 0) {
                attribute.value = 1
            }
        })
    }

    /**
     * Organize and classify Items for Character sheets
     *
     * @param {Object} sheetData The actor to prepare
     *
     * @return {undefined}
     */
    _prepareCharacterItems(sheetData) {
        const actorData = sheetData.actor

        const specialties = []
        const customRolls = []
        const backgrounds = []
        const features = {
            merit: [],
            flaw: []
        }

        sheetData.items.forEach(item => {
            item.img = item.img || DEFAULT_TOKEN
            switch (item.type) {
                case 'specialty':
                    specialties.push(item)
                    break;
                case 'customRoll':
                    customRolls.push(item)
                    break;
                case 'background':
                    backgrounds.push(item)
                    break;
                case 'feature':
                    features[item.data.featuretype].push(item)
                    break;
            }
        })

        actorData.specialties = specialties
        actorData.customRolls = customRolls
        actorData.backgrounds = backgrounds
        actorData.features = features
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html)

        this._setupDotCounters(html)
        this._setupSquareCounters(html)
        this._setupSquareCountersSyb(html)
        this._setupSquareCounters2cf(html)

        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable) return

        // Add Item
        html.find('.item-create').click(this._onItemCreate.bind(this))

        // Update Item
        html.find('.item-edit').click(event => {
            const li = $(event.currentTarget).parents('.item')
            const item = this.actor.getOwnedItem(li.data('itemId'))
            item.sheet.render(true)
        })

        // Delete Item
        html.find('.item-delete').click(event => {
            const li = $(event.currentTarget).parents('.item')
            this.actor.deleteOwnedItem(li.data('itemId'))
            li.slideUp(200, () => this.render(false))
        })

        // Rollable Attributes
        html.find('.attribute-rollable').click(this._onAttributeRollDialog.bind(this))

        // Rollable Abilities
        html.find('.ability-rollable').click(this._onAbilityRollDialog.bind(this))

        // Rollable Custom
        html.find('.custom-rollable').click(this._onCustomRoll.bind(this))

        html.find('.resource-value > .resource-value-step').click(this._onDotCounterChange.bind(this))
        html.find('.resource-value > .resource-value-empty').click(this._onDotCounterEmpty.bind(this))

        html.find('.resource-counter > .resource-counter-step').click(this._onSquareCounterChange.bind(this))
        html.find('.resource-counter > .resource-counter2-step').click(this._onSquareCounterChange.bind(this))
        html.find('.resource-counter > .resource-counter3-step').click(this._onSquareCounterChange.bind(this))
        html.find('.resource-counter > .resource-vitality-step').click(this._onSquareCounterChange.bind(this))

        html.find('.resource-counter-syb > .resource-counter-syb-step').click(this._onSquareSybCounterChange.bind(this))
        html.find('.resource-button').click(this._onSquare2cfCounterChange.bind(this))

        // Collapsible
        const coll = document.getElementsByClassName('collapsible')

        for (let i = 0; i < coll.length; i++) {
            coll[i].addEventListener('click', function () {
                this.classList.toggle('active')
                const content = this.parentElement.nextElementSibling
                if (content.style.maxHeight) {
                    content.style.maxHeight = null
                } else {
                    content.style.maxHeight = content.scrollHeight + 'px'
                }
            })
        }
    }

    /**
     * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
     *
     * @param {Event} event   The originating click event
     * @private
     */
    _onItemCreate(event) {
        event.preventDefault()

        const header = event.currentTarget

        // Get the type of Item to create
        const type = header.dataset.type

        // Grab any data associated with this control
        const data = duplicate(header.dataset)

        if (type === 'specialty') {
            data.ability = ''
        }

        // Initialize a default name
        const name = `New ${type.capitalize()}`

        // Prepare the Item object
        const itemData = {
            name: name,
            type: type,
            data: data
        }

        // Remove the type from the dataset since it's in the itemData.type prop
        delete itemData.data.type

        // Create the Item
        return this.actor.createOwnedItem(itemData)
    }

    /********************
     * ROLLS
     ********************/

    /**
     * Handle clickable rolls.
     *
     * @param {Event} event   The originating click event
     * @private
     */
    _onRoll(event) {
        event.preventDefault()
        const element = event.currentTarget
        const dataset = element.dataset

        if (dataset.roll) {
            const roll = new Roll(dataset.roll + 'dvcs>5', this.actor.data.data)
            const rollResult = roll.evaluate()

            let success = 0
            let critSuccess = 0
            let fail = 0

            rollResult.terms[0].results.forEach((dice) => {
                if (dice.success) {
                    if (dice.result === 10) {
                        critSuccess++
                    } else {
                        success++
                    }
                } else {
                    fail++
                }
            })

            let totalCritSuccess = 0
            totalCritSuccess = Math.floor(critSuccess / 2)
            const totalSuccess = (totalCritSuccess * 2) + success + critSuccess

            let label = dataset.label ? `<p class="roll-label uppercase">${dataset.label}</p>` : ''

            if (totalCritSuccess) {
                label = label + `<p class="roll-content">${game.i18n.localize('MTAv20.CriticalSuccess')}</p>`
            }

            label = label + `<p class="roll-label">${game.i18n.localize('MTAv20.Successes')}: ${totalSuccess}</p>`

            for (let i = 0, j = critSuccess; i < j; i++) {
                label = label + '<img src="systems/MTAv20/assets/images/normal-crit.png" alt="Normal Crit" class="roll-img">'
            }
            for (let i = 0, j = success; i < j; i++) {
                label = label + '<img src="systems/MTAv20/assets/images/normal-success.png" alt="Normal Success" class="roll-img">'
            }
            for (let i = 0, j = fail; i < j; i++) {
                label = label + '<img src="systems/MTAv20/assets/images/normal-fail.png" alt="Normal Fail" class="roll-img">'
            }

            rollResult.toMessage({
                speaker: ChatMessage.getSpeaker({actor: this.actor}),
                flavor: label
            })
        }
    }

    /**
     * Handle rolls
     *
     * @param dicePool      Number of dices to roll
     * @param difficulty    Roll difficulty
     * @param modifier      Roll modifier
     * @param rollTitle     Roll title
     * @param specialty     Is specialty?
     * @private
     */
    _roll(dicePool, difficulty, modifier, rollTitle = '', specialty = false) {
        let roll
        let flavor
        if (specialty) {
            roll = new Roll(`${dicePool + modifier}d10cs>=${difficulty}`).evaluate()
            flavor = `<p class="roll-content">${game.i18n.localize('MTAv20.Specialty')} ${game.i18n.localize('MTAv20.Roll')}: ${game.i18n.localize(rollTitle)}</p>`
        } else {
            roll = new Roll(`${dicePool + modifier}d10cs>=${difficulty}df=1`).evaluate()
            flavor = `<p class="roll-content">${game.i18n.localize('MTAv20.Roll')}: ${game.i18n.localize(rollTitle)}</p>`
        }

        if (roll.total < 0) {
            flavor += `<p class="roll-content roll-botch" style="color: red">Botch!</p>`
        } else if (roll.total === 0) {
            flavor += `<p class="roll-content roll-total-failure" style="color: red">Total failure!</p>`
        }

        roll.toMessage({
            user: game.user._id,
            flavor: flavor,
            speaker: ChatMessage.getSpeaker({token: this.token}),
        })
    }

    /**
     * Calculate life modifier for rolls
     *
     * @returns {number}    Roll modifier
     * @private
     */
    _lifeModifier() {
        let modifier = 0;
        let currentLife = this.actor.data.data.health.total

        if ((currentLife > 1) && (currentLife <= 3)) {
            modifier = -1;
        } else if ((currentLife > 3) && (currentLife <= 5)) {
            modifier = -2;
        } else if (currentLife > 5) {
            modifier = -5;
        }

        return modifier;
    }

    /**
     * Handle clickable Attribute rolls
     *
     * @param {Event} event   The originating click event
     * @private
     */
    _onAttributeRollDialog(event) {
        event.preventDefault();

        // Get HTML Label to Target
        const element = event.currentTarget

        // Get Attribute properties: { label: name, roll: values }
        const attributeProperties = element.dataset

        let lifeModifier = this._lifeModifier();

        const template = `
        <form>
            <div class="form-group">
                <label>${game.i18n.localize('MTAv20.Difficulty')}</label>
                <input type="number" min="0" id="inputDif" value="6">
            </div>
            <div class="form-group">
                <label>${game.i18n.localize('MTAv20.Modifier')}</label>
                <input type="number" id="inputMod" value="${lifeModifier}">
            </div>
            <div class="form-group">
              <label>${game.i18n.localize('MTAv20.Specialty')}</label>
              <input type="checkbox" id="inputSpec" class="">
            </div>
        </form>`

        let buttons = {
            draw: {
                icon: '<i class="fas fa-check"></i>',
                label: game.i18n.localize('MTAv20.Roll'),
                callback: async (html) => {
                    const dicePool = parseInt(attributeProperties.roll)
                    const difficulty = parseInt(html.find('#inputDif')[0].value || 6)
                    const modifier = parseInt(html.find('#inputMod')[0].value || 0)
                    const specialty = html.find('#inputSpec')[0].checked || false
                    const attributeName = attributeProperties.label
                    this._roll(dicePool, difficulty, modifier, attributeName, specialty);
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: game.i18n.localize('MTAv20.Cancel')
            }
        }

        new Dialog({
            title: `${game.i18n.localize('MTAv20.Rolling')}   ${game.i18n.localize(attributeProperties.label)}`,
            content: template,
            buttons: buttons,
            default: 'draw'
        }).render(true)
    }

    /**
     * Handle clickable Ability rolls
     *
     * @param {Event} event   The originating click event
     * @private
     */
    _onAbilityRollDialog(event) {
        event.preventDefault();
        // Get HTML Label fo Target
        const element = event.currentTarget
        // Get Abilities properties: { label: name, roll: values }
        const abilityProperties = element.dataset

        let options = '';
        for (const [key, value] of Object.entries(this.actor.data.data.attributes)) {
            options = options.concat(`<option value="${key}">${game.i18n.localize(value.name)}</option>`)
        }

        let lifeModifier = this._lifeModifier();

        const template = `
        <form>
            <div class="form-group">
                <label>${game.i18n.localize('MTAv20.SelectAttribute')}</label>
                <select id="attributeSelect">${options}</select>
            </div>
            <div class="form-group">
                <label>${game.i18n.localize('MTAv20.Difficulty')}</label>
                <input type="number" min="0" id="inputDif" value="6">
            </div>
            <div class="form-group">
                <label>${game.i18n.localize('MTAv20.Modifier')}</label>
                <input type="number" id="inputMod" value="${lifeModifier}">
            </div>
            <div class="form-group">
              <label>${game.i18n.localize('MTAv20.Specialty')}</label>
              <input type="checkbox" id="inputSpec">
            </div>
        </form>`

        let buttons = {
            draw: {
                icon: '<i class="fas fa-check"></i>',
                label: game.i18n.localize('MTAv20.Roll'),
                callback: async (html) => {
                    const attribute = html.find('#attributeSelect')[0].value
                    const attributePool = this.actor.data.data.attributes[attribute].value
                    const dicePool = attributePool + parseInt(abilityProperties.roll)
                    const difficulty = parseInt(html.find('#inputDif')[0].value || 6)
                    const modifier = parseInt(html.find('#inputMod')[0].value || 0)
                    const specialty = html.find('#inputSpec')[0].checked || false
                    const abilityName = abilityProperties.label
                    this._roll(dicePool, difficulty, modifier, abilityName, specialty);
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: game.i18n.localize('MTAv20.Cancel')
            }
        }

        new Dialog({
            title: `${game.i18n.localize('MTAv20.Rolling')}   ${game.i18n.localize(abilityProperties.label)}`,
            content: template,
            buttons: buttons,
            default: 'draw'
        }).render(true)
    }

    /**
     * Handle custom rolls
     *
     * @param {Event} event   The originating click event
     * @private
     */
    _onCustomRoll(event) {
        event.preventDefault()

        const element = event.currentTarget
        const dataset = element.dataset

        if (dataset.dice1 === '') {
            this._onSpecialtyRollDialog(event)
        } else {
            this._onCustomRollRollDialog(event)
        }
    }

    /**
     * Handle Specialty custom roll
     *
     * @param {Event} event   The originating click event
     * @private
     */
    _onSpecialtyRollDialog(event) {
        event.preventDefault()

        const element = event.currentTarget
        const abilityProperties = element.dataset

        let options = ''
        for (const [key, value] of Object.entries(this.actor.data.data.attributes)) {
            options = options.concat(`<option value="${key}">${game.i18n.localize(value.name)}</option>`)
        }

        let lifeModifier = this._lifeModifier();

        const template = `
        <form>
            <div class="form-group">
                <label>${game.i18n.localize('MTAv20.SelectAttribute')}</label>
                <select id="attributeSelect">${options}</select>
            </div>  
            <div class="form-group">
                <label>${game.i18n.localize('MTAv20.Difficulty')}</label>
                <input type="text" min="0" id="inputDif" value="6">
            </div>
            <div class="form-group">
                <label>${game.i18n.localize('MTAv20.Modifier')}</label>
                <input type="text" id="inputMod" value="${lifeModifier}">
            </div>
        </form>`

        let buttons = {
            draw: {
                icon: '<i class="fas fa-check"></i>',
                label: game.i18n.localize('MTAv20.Roll'),
                callback: async (html) => {
                    const attribute = html.find('#attributeSelect')[0].value
                    const attributePool = this.actor.data.data.attributes[attribute].value
                    const abilityPool = this.actor.data.data.abilities[abilityProperties.dice2].value
                    const dicePool = attributePool + abilityPool
                    const difficulty = parseInt(html.find('#inputDif')[0].value || 6)
                    const modifier = parseInt(html.find('#inputMod')[0].value || 0)
                    const abilityName = abilityProperties.name
                    this._roll(dicePool, difficulty, modifier, abilityName, true);
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: game.i18n.localize('MTAv20.Cancel')
            }
        }

        new Dialog({
            title: game.i18n.localize('MTAv20.Rolling') + ` ${abilityProperties.name}`,
            content: template,
            buttons: buttons,
            default: 'draw'
        }).render(true)
    }

    /**
     * Handle CustomRoll custom roll
     *
     * @param {Event} event   The originating click event
     * @param dicePool        Dice pool calculated earlier
     * @param title           CustomRoll title
     * @private
     */
    _onCustomRollRollDialog(event, dicePool, title) {
        event.preventDefault()

        const element = event.currentTarget
        const dataset = element.dataset

        let lifeModifier = this._lifeModifier();

        const template = `
        <form>
            <div class="form-group">
                <label>${game.i18n.localize('MTAv20.Difficulty')}</label>
                <input type="text" min="0" id="inputDif" value="6">
            </div>
            <div class="form-group">
                <label>${game.i18n.localize('MTAv20.Modifier')}</label>
                <input type="text" id="inputMod" value="${lifeModifier}">
            </div>
            <div class="form-group">
              <label>${game.i18n.localize('MTAv20.Specialty')}</label>
              <input type="checkbox" id="inputSpec">
            </div>
        </form>`

        let buttons = {
            draw: {
                icon: '<i class="fas fa-check"></i>',
                label: game.i18n.localize('MTAv20.Roll'),
                callback: async (html) => {
                    const attributeDicePool = this.actor.data.data.attributes[dataset.dice1].value
                    const abilityDicePool = this.actor.data.data.abilities[dataset.dice2].value
                    const dicePool = attributeDicePool + abilityDicePool
                    const difficulty = parseInt(html.find('#inputDif')[0].value || 6)
                    const modifier = parseInt(html.find('#inputMod')[0].value || 0)
                    const specialty = html.find('#inputSpec')[0].checked || false
                    const title = dataset.name
                    this._roll(dicePool, difficulty, modifier, title, specialty);
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: game.i18n.localize('MTAv20.Cancel')
            }
        }

        new Dialog({
            title: game.i18n.localize('MTAv20.Rolling') + ` ${dataset.name}`,
            content: template,
            buttons: buttons,
            default: 'draw'
        }).render(true)
    }

    /********************
     * RESOURCES
     ********************/

    // There's gotta be a better way to do this but for the life of me I can't figure it out
    _assignToActorField(fields, value) {
        const actorData = duplicate(this.actor)
        const lastField = fields.pop()
        fields.reduce((data, field) => data[field], actorData)[lastField] = value
        this.actor.update(actorData)
    }

    _onDotCounterEmpty(event) {
        event.preventDefault()
        const element = event.currentTarget
        const parent = $(element.parentNode)
        const fieldStrings = parent[0].dataset.name
        const fields = fieldStrings.split('.')
        const steps = parent.find('.resource-value-empty')

        steps.removeClass('active')
        this._assignToActorField(fields, 0)
    }

    _onSquareCounterChange(event) {
        event.preventDefault()
        const element = event.currentTarget
        const index = Number(element.dataset.index)
        const oldState = element.dataset.state || ''
        const parent = $(element.parentNode)
        const data = parent[0].dataset
        const states = parseCounterStates(data.states)
        const fields = data.name.split('.')
        var steps = parent.find('.resource-counter-step')
        const humanity = data.name === 'data.humanity'
        const fulls = Number(data[states['-']]) || 0
        const halfs = Number(data[states['/']]) || 0
        const crossed = Number(data[states.x]) || 0

        if (steps.length === 0) {
            steps = parent.find('.resource-counter2-step')
        }

        if (steps.length === 0) {
            steps = parent.find('.resource-counter3-step')
        }

        if (steps.length === 0) {
            steps = parent.find('.resource-vitality-step')
        }

        if (index < 0 || index > steps.length) {
            return
        }

        const allStates = ['', ...Object.keys(states)]
        const currentState = allStates.indexOf(oldState)
        if (currentState < 0) {
            return
        }

        const newState = allStates[(currentState + 1) % allStates.length]
        steps[index].dataset.state = newState

        if ((oldState !== '' && oldState !== '-') || (oldState !== '' && humanity)) {
            data[states[oldState]] = Number(data[states[oldState]]) - 1
        }

        // If the step was removed we also need to subtract from the maximum.
        if (oldState !== '' && newState === '' && !humanity) {
            data[states['-']] = Number(data[states['-']]) - 1
        }

        if (newState !== '') {
            data[states[newState]] = Number(data[states[newState]]) + Math.max(index + 1 - fulls - halfs - crossed, 1)
        }

        const newValue = Object.values(states).reduce(function (obj, k) {
            obj[k] = Number(data[k]) || 0

            return obj
        }, {})

        this._assignToActorField(fields, newValue)
    }

    _onSquareSybCounterChange(event) {
        event.preventDefault()
        const element = event.currentTarget
        const index = Number(element.dataset.index)
        const oldState = element.dataset.state || ''
        const parent = $(element.parentNode)
        const data = parent[0].dataset
        const states = parseCounterStates(data.states)
        const fields = data.name.split('.')
        var steps = parent.find('.resource-counter-syb-step')
        const halfs = Number(data[states['/']]) || 0
        const crossed = Number(data[states.x]) || 0

        if (index < 0 || index > steps.length) {
            return
        }

        const allStates = ['', ...Object.keys(states)]
        const currentState = allStates.indexOf(oldState)
        if (currentState < 0) {
            return
        }

        const newState = allStates[(currentState + 1) % allStates.length]
        steps[index].dataset.state = newState

        if ((oldState !== '' && oldState !== '-') || (oldState !== '')) {
            data[states[oldState]] = Number(data[states[oldState]]) - 1
        }

        // If the step was removed we also need to subtract from the maximum.
        if (oldState !== '' && newState === '') {
            data[states['-']] = Number(data[states['-']]) - 1
        }

        if (newState !== '') {
            data[states[newState]] = Number(data[states[newState]]) + Math.max(index + 1 - halfs - crossed, 1)
        }

        const newValue = Object.values(states).reduce(function (obj, k) {
            obj[k] = Number(data[k]) || 0
            return obj
        }, {})

        this._assignToActorField(fields, newValue)
    }

    _onSquare2cfCounterChange(event) {
        event.preventDefault()
        const element = event.currentTarget
        const index = element.dataset.index
        const state = element.dataset.state

        const totalQ = this.actor.data.data.magika.quintessence
        const totalP = this.actor.data.data.magika.paradox
        var stapOver = false

        if ((totalQ + totalP) === 20) {
            stapOver = true
        }

        if (index === 'q') {
            if (state === '+') {
                // Add if quintessence < 20
                (totalQ < 20) && this._assignToActorField(['data', 'magika'], {quintessence: totalQ + 1})
                // Stap Over Paradox if necessary
                stapOver && this._assignToActorField(['data', 'magika'], {paradox: totalP - 1})
            } else {
                // Remove if quintessence > 0
                (totalQ > 0) && this._assignToActorField(['data', 'magika'], {quintessence: totalQ - 1})
            }
        } else {
            if (state === '+') {
                (totalP < 20) && this._assignToActorField(['data', 'magika'], {paradox: totalP + 1})
                stapOver && this._assignToActorField(['data', 'magika'], {quintessence: totalQ - 1})
            } else {
                (totalP > 0) && this._assignToActorField(['data', 'magika'], {paradox: totalP - 1})
            }
        }
    }

    _onDotCounterChange(event) {
        event.preventDefault()
        const element = event.currentTarget
        const dataset = element.dataset
        const index = Number(dataset.index)
        const parent = $(element.parentNode)
        const fieldStrings = parent[0].dataset.name
        const fields = fieldStrings.split('.')
        const steps = parent.find('.resource-value-step')
        if (index < 0 || index > steps.length) {
            return
        }

        steps.removeClass('active')
        steps.each(function (i) {
            if (i <= index) {
                $(this).addClass('active')
            }
        })
        this._assignToActorField(fields, index + 1)
    }

    _setupDotCounters(html) {
        html.find('.resource-value').each(function () {
            const value = Number(this.dataset.value)
            $(this).find('.resource-value-step').each(function (i) {
                if (i + 1 <= value) {
                    $(this).addClass('active')
                }
            })
        })
    }

    _setupSquareCounters(html) {
        html.find('.resource-counter').each(function () {
            const data = this.dataset
            const states = parseCounterStates(data.states)
            const humanity = data.name === 'data.humanity'

            const fulls = Number(data[states['-']]) || 0
            const halfs = Number(data[states['/']]) || 0
            const crossed = Number(data[states.x]) || 0

            const values = humanity ? new Array(fulls + halfs) : new Array(fulls)
            values.fill('-', 0, fulls)
            if (humanity) {
                values.fill('/', fulls, fulls + halfs)
            } else {
                values.fill('/', fulls - halfs - crossed, fulls - crossed)
                values.fill('x', fulls - crossed, fulls)
            }

            $(this).find('.resource-counter-step').each(function () {
                this.dataset.state = ''
                if (this.dataset.index < values.length) {
                    this.dataset.state = values[this.dataset.index]
                }
            })

            $(this).find('.resource-counter2-step').each(function () {
                this.dataset.state = ''
                if (this.dataset.index < values.length) {
                    this.dataset.state = values[this.dataset.index]
                }
            })

            $(this).find('.resource-counter3-step').each(function () {
                this.dataset.state = ''
                if (this.dataset.index < values.length) {
                    this.dataset.state = values[this.dataset.index]
                }
            })

            $(this).find('.resource-vitality-step').each(function () {
                this.dataset.state = ''
                if (this.dataset.index < values.length) {
                    this.dataset.state = values[this.dataset.index]
                }
            })
        })
    }

    _setupSquareCountersSyb(html) {
        html.find('.resource-counter-syb').each(function () {
            const data = this.dataset
            const states = parseCounterStates(data.states)

            const halfs = Number(data[states['/']]) || 0
            const crossed = Number(data[states.x]) || 0

            const values = new Array(halfs)
            values.fill('/', 0, halfs)
            values.fill('x', halfs - crossed, halfs)

            $(this).find('.resource-counter-syb-step').each(function () {
                this.dataset.state = ''
                if (this.dataset.index < values.length) {
                    this.dataset.state = values[this.dataset.index]
                }
            })
        })
    }

    _setupSquareCounters2cf(html) {
        html.find('.resource-counter-2cf').each(function () {
            const data = this.dataset
            const states = parseCounterStates(data.states)

            const fulls = Number(data[states['-']]) || 0
            const halfs = Number(data[states['/']]) || 0

            const values = new Array(20)

            values.fill('-', 0, fulls)
            values.fill('/', 20 - halfs, 20)

            $(this).find('.resource-counter-2cf-step').each(function () {
                this.dataset.state = ''
                if (this.dataset.index < values.length) {
                    this.dataset.state = values[this.dataset.index]
                }
            })
        })
    }
}

function parseCounterStates(states) {
    return states.split(',').reduce((obj, state) => {
        const [k, v] = state.split(':')
        obj[k] = v
        return obj
    }, {})
}
