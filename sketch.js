/**
 *  @author
 *  @date 2023.
 *
 */

let font
let fixedWidthFont
let variableWidthFont
let instructions
let debugCorner /* output debug text in the bottom left corner of the canvas */
let periodicTableJSON
let elementSize = 85 // each element is a square. this is the size of it.
let selectedElement = 1
let elementImages = {} // the names are the keys and the images are the values.

// in the search bar there is a cursor as you would expect from a text bar
let searchCursor = 0
let textInSearchBar = "" // this is the actual text inside

// The cursor displays only half a second every second.
// Without this variable, we sometimes wouldn't be able to see our cursor
// when moving. This represents the base milliseconds that we offset the
// cursor display by.
let cursorDisplayBaseMillis = 0

function preload() {
    font = loadFont('data/consola.ttf') // the font we'll be using
    fixedWidthFont = loadFont('data/consola.ttf') // this is the same as "font"
    variableWidthFont = loadFont('data/meiryo.ttf') // another font option
    periodicTableJSON = loadJSON('data/elementsBowserinator.json', processData)
}

function processData(data) {
    // there are 119 images available from all elements (I know I haven't
    // missed any), and we should download them to elementImages.
    for (let i = 0; i < 119; i++) {
        let elementData = data["elements"][i]
        let name = elementData["name"]

        // generally the element has a jpg file. But a few images are pngs.
        let pngImageNames = [
            "Tennessine",
            "Seaborgium",
            "Roentgenium",
            "Promethium",
            "Oganesson",
            "Nihonium",
            "Moscovium",
            "Meitnerium",
            "Livermorium",
            "Hassium",
            "Flerovium",
            "Dubnium",
            "Darmstadtium",
            "Copernicium",
            "Carbon",
            "Bohrium",
            "Actinium"
        ]
        if (pngImageNames.includes(name)) {
            print("PNG", name)
            elementImages[name] = loadImage(`elementImages/${name}.png`)
        } else {
            print("JPG", name)
            elementImages[name] = loadImage(`elementImages/${name}.jpg`)
        }
    }

    // now we go to the business of doing the bohr model image. it's in the
    // json already for all 119 elements.
    for (let i = 0; i < 119; i++) {
        let elementData = data["elements"][i]

        // "bohr_model_image" is a url. It's supposed to be an image.
        elementData["bohr_model_image"] = loadImage(elementData["bohr_model_image"])
    }
}


function setup() {
    let cnv = createCanvas(1500*elementSize/75, 900*elementSize/75)
    cnv.parent('#canvas')
    colorMode(HSB, 360, 100, 100, 100)
    textFont(font, 14)

    /* initialize instruction div */
    instructions = select('#ins')
    instructions.html(`<pre>
        numpad 1 → freeze sketch
        Note: Auto-sketchfreeze designed for quick usages of no more than 10 minutes.</pre>`)

    debugCorner = new CanvasDebugCorner(5)
    frameRate(60)
}


function draw() {
    background(234, 34, 24)
    fill(0, 0, 100)

    // display all period labels
    // there are 7 periods. However, since it's been around 20 years since
    // Og (element 118, the last element on most periodic tables and the
    // last element of period 7) was discovered, so I'm expecting ununseptium
    // to be named soon, which will add an 8th period. Go scientists!!!
    // Although it's entirely possible there's a group 19 or something, and
    // I totally do not expect that. But I'm no expert on chemistry, and I
    // don't think even the experts know, because I believe it's impossible to
    // know a lot about undiscovered elements.

    let padding = 4*elementSize/75 // padding for squares.

    let yPos = elementSize*3/2 // we are displaying this in the center.
    let xPos = elementSize*3/4 // the xPos to display the period labels on.
    textAlign(CENTER, CENTER)

    // since we'll be facilitating scrolling, we need to scale everything to
    // the element size. Everything has to depend on that.
    textSize((elementSize/75)*14)
    for (let period = 1; period <= 7; period += 1) {
        text(period, xPos, yPos)
        yPos += elementSize
    }

    // on the other hand, the groups are a bit different. we're going to be
    // displaying them on varying yPoses.
    // we're representing on which square on the virtual grid we're
    // displaying them on.
    let yPoses = [1, 1, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 2, 2, 2, 2, 2, 1]
    xPos = elementSize*3/2
    for (let group = 1; group <= 18; group += 1) {
        text(group, xPos, (yPoses[group - 1] - 1/4)*elementSize)
        xPos += elementSize
    }

    // now we display a square for each element
    let i = 0

    // this is going to be more complex than you think it is. it's also when
    // we check for whether the element is lightened up, and we want to keep
    // track of that.
    let matches = []

    for (let element of periodicTableJSON["elements"]) {
        // xPos and yPos represent the top-left corner of the grey square
        // note: there is a padding of 4, making for a grey square that is
        // actually 68 in size.
        xPos = element["group"]*elementSize
        yPos = element["period"]*elementSize

        // get all the variables initialized
        let chemSymbol = element["symbol"]
        let category = element["category"]
        let normalPhase = element["phase"]
        let z = element["number"]
        let name = element["name"]

        // however, there is an exception with the lanthanides and actinides.
        // the json displays it as period 6 or 7 and group 3, whereas it's
        // actually supposed to be displayed as if it's period 8 or 9 and group
        // 4+.

        // atomic numbers 57-71 correspond to lanthanides (groups 4-18).
        if (z >= 57 && z <= 71) {
            let group = z - 53
            let period = element["period"] + 2
            xPos = group*elementSize
            yPos = period*elementSize
        }

        // atomic numbers 89-103 correspond to actinides (groups 4-18).
        if (z >= 89 && z <= 103) {
            let group = z - 85
            let period = element["period"] + 2
            xPos = group*elementSize
            yPos = period*elementSize
        }

        // now we need to decide the color
        fill(0, 0, 20)
        strokeWeight(elementSize/75)
        stroke(0, 0, 30)
        switch (category) {
            case "diatomic nonmetal":
                // diatomic nonmetals like Hydrogen are yellow.
                fill(55, 80, 60)
                stroke(55, 80, 80)
                break
            case "noble gas":
                // noble gasses like Helium are light brown.
                fill(20, 80, 40)
                stroke(20, 80, 60)
                break
            case "alkali metal":
                // alkali metals like Lithium are red.
                fill(0, 70, 30)
                stroke(0, 70, 50)
                break
            case "alkaline earth metal":
                // alkaline earth metals like Beryllium are blue.
                fill(240, 80, 30)
                stroke(240, 80, 50)
                break
            case "metalloid":
                // metalloids like Boron are dark green.
                fill(80, 80, 20)
                stroke(80, 100, 30)
                break
            case "polyatomic nonmetal":
                // polyatomic nonmetals like Carbon are yellow. A little bit
                // more saturated, darker, and a bit greener than diatomic
                // nonmetals.
                fill(60, 85, 55)
                stroke(60, 85, 75)
                break
            case "post-transition metal":
                // post-transition metals like aluminum are green.
                fill(100, 60, 40)
                stroke(100, 60, 60)
                break
            case "transition metal":
                // transition metals like scandium are light blue.
                fill(220, 80, 35)
                stroke(220, 80, 45)
                break
            case "lanthanide":
                // lanthanides like Lanthanum are cyan.
                fill(180, 80, 40)
                stroke(180, 80, 70)
                break
            case "actinide":
                // actinides like Actinum are teal.
                fill(160, 80, 40)
                stroke(160, 80, 70)
                break
        }

        // now we draw the square.
        rectMode(CORNER)

        // we will use all of these later for mouse pressing business.
        let leftXPos = xPos + padding
        let topYPos = yPos + padding
        let squareSize = elementSize - padding*2
        let rightXPos = leftXPos + squareSize
        let bottomYPos = topYPos + squareSize
        square(leftXPos, topYPos, squareSize)


        // now we draw the chemical symbol
        fill(0, 0, 100)
        textSize(25*(elementSize/75))
        text(chemSymbol, xPos + elementSize/2, yPos + 3*elementSize/7)

        // then the atomic number
        textSize(10*(elementSize/75))
        text(z, xPos + elementSize/2, yPos + elementSize/7)

        // then the actual name
        text(name, xPos + elementSize/2, yPos + 5*elementSize/7)

        // and then the chemical group
        textSize(5.8*(elementSize/75))
        if (category.indexOf("unknown") === -1) {
            // display the full category only if it isn't a hypothesis
            text(category, xPos + elementSize/2, yPos + 6*elementSize/7)
        } else {
            // if it does contain unknown then it'll definitely be too large
            // for the text
            text("unknown", xPos + elementSize/2, yPos + 6*elementSize/7)
        }

        i++

        // now we check if the mouse is clicking on it.
        // it is much harder to do this when we don't already know where the
        // square is. we know right now, so we should take the chance.
        if (mouseIsPressed &&
            mouseX > leftXPos && mouseX < rightXPos &&
            mouseY > topYPos && mouseY < bottomYPos) {
            selectedElement = i
            print(selectedElement)
        }

        // we want to darken the element if the name doesn't include what's
        // in the search bar
        if (!name.toLowerCase().includes(textInSearchBar.toLowerCase()) &&
            textInSearchBar.length > 0) {
            fill(0, 0, 0, 50)
            stroke(0, 0, 0, 50)
            strokeWeight(1)

            // we neatly already have all the co-ordinates for the square
            square(leftXPos, topYPos, squareSize)
        }
        // otherwise we lighten it
        if (name.toLowerCase().includes(textInSearchBar.toLowerCase()) &&
            textInSearchBar.length > 0) {
            fill(0, 0, 100, 25)
            stroke(0, 0, 100, 60)
            strokeWeight(1)
            square(leftXPos, topYPos, squareSize)

            // and add it to the match list
            matches.push(i)
        }
    }

    // draw the parallelegram between the last two alkaline earth metals (at
    // least, until the eight alkaline earth metal is released. It should be
    // element 120, but who knows?)
    // we have an increased y padding (6); otherwise it looks weird
    noStroke()
    fill(180, 80, 40)
    stroke(180, 80, 70)
    quad(3*elementSize + padding, 7*elementSize - padding*1.5,
        3*elementSize + padding, 6*elementSize + padding*1.5,
        4*elementSize - padding, 8*elementSize + padding*1.5,
        4*elementSize - padding, 9*elementSize - padding*1.5)
    fill(160, 80, 40)
    stroke(160, 80, 70)
    quad(3*elementSize + padding, 8*elementSize - padding*1.5,
        3*elementSize + padding, 7*elementSize + padding*1.5,
        4*elementSize - padding, 9*elementSize + padding*1.5,
        4*elementSize - padding, 10*elementSize - padding*1.5)



    // now we display the properties of the selected element.
    // selectedElement is the atomic number of the element. That is the
    // index in periodicTableJson["elements"], except minus 1.
    let selectedElementData = periodicTableJSON["elements"][selectedElement - 1]

    // display the summary of the element
    textSize(15*elementSize/75)
    fill(0, 0, 100)
    noStroke()

    // however we will need to do some considerations on what to display.
    // every 110 characters there should be a newline after the previous word.
    let summary = selectedElementData["summary"]
    let summaryWithNewlines = ""
    let charsSinceLastNewline = 0
    for (let char of summary) {
        charsSinceLastNewline += 1

        // add a newline at the beginning of the last word for every 110
        // characters. in other words, replace the last space with a newline.
        if (charsSinceLastNewline === 110) {
            let lastIndex = summaryWithNewlines.lastIndexOf(" ")
            summaryWithNewlines =
                summaryWithNewlines.substring(0, lastIndex) + "\n" +
                summaryWithNewlines.substring(lastIndex + 1)

            charsSinceLastNewline = summaryWithNewlines.length - lastIndex
        }

        // we add the char
        summaryWithNewlines += char
    }

    textAlign(LEFT, TOP)
    text(summaryWithNewlines, elementSize*3, 0)
    textStyle(NORMAL)

    // now we display the example image of the element
    let exampleImage = elementImages[selectedElementData["name"]]
    image(selectedElementData["bohr_model_image"], elementSize*4, elementSize*1.5,
        elementSize*2, elementSize*2)
    image(exampleImage, elementSize*6 + 1, elementSize*1.5,
          elementSize*2, elementSize*2)

    // and we display the description of the element image.
    // however we will need to do some considerations on what to display.
    // every 50 characters there should be a newline after the previous  word.
    let imageTitle = "Right image title: " + selectedElementData["image"]["title"]
    let imageTitleWithNewlines = ""
    charsSinceLastNewline = 0
    for (let char of imageTitle) {
        charsSinceLastNewline += 1

        // add the newline for every 50 characters. Only during a space
        // after a word/sentence.
        if (charsSinceLastNewline >= 50){
            let lastIndex = imageTitleWithNewlines.lastIndexOf(" ")
            imageTitleWithNewlines =
                imageTitleWithNewlines.substring(0, lastIndex) + "\n" +
                imageTitleWithNewlines.substring(lastIndex + 1)

            charsSinceLastNewline = imageTitleWithNewlines.length - lastIndex
        }

        // we add the char
        imageTitleWithNewlines += char
    }
    text(imageTitleWithNewlines, elementSize*8.1, elementSize*1.5)

    // we've finished with the periodic table and the non-detailed
    // description of the selected element.
    // below that we're going to add a detailed description of the selected
    // element.
    stroke(0, 0, 100)
    strokeWeight(1)

    // we add 0.5 to the xPos and yPos because a strokeWeight of 1 actually
    // means a thickness of 0.5, so if we do this, a 1xwidth strand of
    // 100%-opacity white pixels are made, whereas if we don't, a 2xwidth
    // strand of 50%-opacity white pixels are made (because the line spans
    // -0.5 to 0.5, and a fraction of a pixel means a translucent pixel).
    line(0, elementSize*10 + 4.5, width, elementSize*10 + 4.5)
    line(0, elementSize*10 + 8.5, width, elementSize*10 + 8.5)

    // now we display the information for the following things: appearance,
    // average atomic mass, boiling point, melting point, electron
    // configuration, and ionization energy of the first electron.
    textSize(15*elementSize/75)
    fill(0, 0, 100)
    noStroke()
    let appearanceYPos = elementSize*10.2
    let averageAtomicMassYPos = appearanceYPos + textAscent() + textDescent() + padding
    let boilingPointYPos = averageAtomicMassYPos + textAscent() + textDescent() + padding
    let meltingPointYPos = boilingPointYPos + textAscent() + textDescent() + padding
    let electronConfigurationYPos = meltingPointYPos + textAscent() + textDescent() + padding
    let ionizationEnergyFirstElectronYPos = electronConfigurationYPos + textAscent() + textDescent() + padding

    text("Appearance: " + selectedElementData["appearance"], padding, appearanceYPos)
    text("Average atomic mass: " + selectedElementData["atomic_mass"], padding, averageAtomicMassYPos)
    text("Boiling point: " + selectedElementData["boil"] + "º K", padding, boilingPointYPos)
    text("Melting point: " + selectedElementData["melt"] + "º K", padding, meltingPointYPos)
    text("Electron configuration: " + selectedElementData["electron_configuration_semantic"], padding, electronConfigurationYPos)
    text("Ionization energy of one electron: " + selectedElementData["ionization_energies"][0] + "eV", padding, ionizationEnergyFirstElectronYPos)

    // however, we're erasing all this and drawing a new screen if there's
    // only 1 match.
    if (matches.length === 1) {
        background(234, 34, 24)

        // get all the needed data for the element
        let selectedElementData = periodicTableJSON["elements"][matches[0] - 1]

        let name = selectedElementData["name"]
        let appearance = selectedElementData["appearance"]
        let averageMass = selectedElementData["atomic_mass"]
        let boilPoint = selectedElementData["boil"]
        let category = selectedElementData["category"]
        let density = selectedElementData["density"]
        let meltPoint = selectedElementData["melt"]
        let molarHeat = selectedElementData["molar_heat"]
        let z = selectedElementData["number"]
        let period = selectedElementData["period"]
        let group = selectedElementData["group"]
        let normalState = selectedElementData["phase"]
        let bohrModelImage = selectedElementData["bohr_model_image"]
        let summary = selectedElementData["summary"]
        let chemSymbol = selectedElementData["symbol"]
        let electronConfig = selectedElementData["electron_configuration_semantic"]
        let electronAffinity = selectedElementData["electron_affinity"]
        let electronegativity = selectedElementData["electronegativity_pauling"]
        let ionizationEnergies = selectedElementData["ionization_energies"]
        let image = selectedElementData["image"]
        let block = selectedElementData["block"]

        // draw a big version of the element square at the bottom-left.
        // now we need to decide the color
        fill(0, 0, 20)
        strokeWeight(elementSize/75)
        stroke(0, 0, 30)
        switch (category) {
            case "diatomic nonmetal":
                // diatomic nonmetals like Hydrogen are yellow.
                fill(55, 80, 60)
                stroke(55, 80, 80)
                break
            case "noble gas":
                // noble gasses like Helium are light brown.
                fill(20, 80, 40)
                stroke(20, 80, 60)
                break
            case "alkali metal":
                // alkali metals like Lithium are red.
                fill(0, 70, 30)
                stroke(0, 70, 50)
                break
            case "alkaline earth metal":
                // alkaline earth metals like Beryllium are blue.
                fill(240, 80, 30)
                stroke(240, 80, 50)
                break
            case "metalloid":
                // metalloids like Boron are dark green.
                fill(80, 80, 20)
                stroke(80, 100, 30)
                break
            case "polyatomic nonmetal":
                // polyatomic nonmetals like Carbon are yellow. A little bit
                // more saturated, darker, and a bit greener than diatomic
                // nonmetals.
                fill(60, 85, 55)
                stroke(60, 85, 75)
                break
            case "post-transition metal":
                // post-transition metals like aluminum are green.
                fill(100, 60, 40)
                stroke(100, 60, 60)
                break
            case "transition metal":
                // transition metals like scandium are light blue.
                fill(220, 80, 35)
                stroke(220, 80, 45)
                break
            case "lanthanide":
                // lanthanides like Lanthanum are cyan.
                fill(180, 80, 40)
                stroke(180, 80, 70)
                break
            case "actinide":
                // actinides like Actinum are teal.
                fill(160, 80, 40)
                stroke(160, 80, 70)
                break
        }

        // now we draw the square.
        rectMode(CORNER)

        // we will use all of these as references.
        // we want the element square to be situated just under the text box.
        // the height of the text box (as marked below) is textAscent() +
        // textDescent() while the text size is 16*(elementSize/75)
        textSize(16*(elementSize/75))
        let squareSize = elementSize*3
        let leftXPos = padding
        let topYPos = padding + textAscent() + textDescent()
        square(leftXPos, topYPos, squareSize)

        // display the atomic number
        textSize(13*(elementSize/75))
        noStroke()
        fill(0, 0, 100)
        textAlign(LEFT, TOP)
        text(z, leftXPos, topYPos)

        // and the atomic mass
        textAlign(RIGHT, TOP)
        text(averageMass, leftXPos + squareSize, topYPos)

        // and the symbol
        textAlign(LEFT, TOP)
        textSize(70*(elementSize/75))
        text(chemSymbol, leftXPos, topYPos + 13*(elementSize/75))

        // and the name
        textAlign(RIGHT, TOP)
        textSize(10*(elementSize/75))
        text(name, leftXPos + squareSize, topYPos + 16*(elementSize/75))

        // after that we add "normal state" + "category"
        // for example, "Solid transition metal" or "Liquid diatomic nonmetal"
        // or "Gaseous diatomic nonmetal"
        text(normalState + " " + category, leftXPos + squareSize, topYPos + 29*(elementSize/75))


        textAlign(LEFT, TOP)
    }

    // at the top-left we always have the search box.
    // we'll be situating this such that it touches the corner.
    fill(0, 0, 25)
    stroke(0, 0, 50)
    strokeWeight(1)
    textSize(16*(elementSize/75))
    rect(0, 0, elementSize*2.5, textAscent() + textDescent())

    // then display a magnifying glass.
    // a magnifying glass is made of a line and an unfilled circle.
    noFill()

    // the line's bottom-left co-ordinate is slightly above and to the right of
    // the bottom-left corner of the textbox.
    let bottomLeftXPos = elementSize*0.05
    let bottomLeftYPos = textAscent() + textDescent() - elementSize*0.05

    // the circle's center co-ordinate is more above and to the right of the
    // bottom-left corner of the textbox.
    let circleCenterXPos = elementSize*0.13
    let circleCenterYPos = textAscent() + textDescent() - elementSize*0.13
    let circleDiameter = elementSize*0.08

    // if we want to make the magnifying glass line connect with the circle,
    // we'd have to calculate the position of the bottom-left point of the
    // circle is.
    // luckily, I know well how to calculate that. the sine and cosine of 45º
    // are both (√2)/2.
    let connectionPointXPos = circleCenterXPos - circleDiameter/2*((sqrt(2))/2)
    let connectionPointYPos = circleCenterYPos + circleDiameter/2*((sqrt(2))/2)

    strokeWeight(elementSize/75)
    line(bottomLeftXPos, bottomLeftYPos, connectionPointXPos, connectionPointYPos)
    circle(circleCenterXPos, circleCenterYPos, circleDiameter)

    // the magnifying glass takes up elementSize*0.2 space, including the
    // padding. we should position the text accordingly.
    noStroke()
    fill(0, 0, 80)
    let textBeginningXPos = elementSize*0.2
    text(textInSearchBar, textBeginningXPos, elementSize/75)

    // then we draw the cursor
    if ((millis() - cursorDisplayBaseMillis) % 1000 < 500) {
        stroke(0, 0, 100)
        strokeWeight(1)
        let cursorXPos = textBeginningXPos + textWidth(" ") * searchCursor - 0.5
        line(cursorXPos, 3 * elementSize / 75,
            cursorXPos, textAscent() + textDescent() - 3 * elementSize / 75)
    }

    /* debugCorner needs to be last so its z-index is highest */
    // debugCorner.setText(`frameCount: ${frameCount}`, 2)
    // debugCorner.setText(`fps: ${frameRate().toFixed(0)}`, 1)
    // debugCorner.showBottom()

    if (frameCount > 36000)
        noLoop()

    noStroke()
}


function keyPressed() {


    /* stop sketch */
    if (keyCode === 97) { /* numpad 1 */
        noLoop()
        instructions.html(`<pre>
            sketch stopped</pre>`)
    }

    if (key === '`') { /* toggle debug corner visibility */
        debugCorner.visible = !debugCorner.visible
        console.log(`debugCorner visibility set to ${debugCorner.visible}`)
    }

    // we can type in the search bar, any letter
    if (["a", "b", "c", "d", "e", "f", "g",
         "h", "i", "j", "k", "l", "m", "n",
         "o", "p", "q", "r", "s", "t",
         "u", "v", "w", "x", "y", "z"]
        .includes(key.toLowerCase()) &&
        textInSearchBar.length < 18) {
        // insert a letter into the search bar
        textInSearchBar =
            textInSearchBar.substring(0, searchCursor) +
            key +
            textInSearchBar.substring(searchCursor)

        // at the end we're always moving the cursor to the right
        searchCursor += 1

        cursorDisplayBaseMillis = millis()
    }
    // or delete
    if (keyCode === BACKSPACE && textInSearchBar.length > 0) {
        searchCursor -= 1
        textInSearchBar =
            textInSearchBar.substring(0, searchCursor) +
            textInSearchBar.substring(searchCursor + 1)
        cursorDisplayBaseMillis = millis()
    }
    // or go left/right
    if (keyCode === LEFT_ARROW && searchCursor > 0) {
        searchCursor -= 1
        cursorDisplayBaseMillis = millis()
    } if (keyCode === RIGHT_ARROW && searchCursor < textInSearchBar.length) {
        searchCursor += 1
        cursorDisplayBaseMillis = millis()
    }
}


/** 🧹 shows debugging info using text() 🧹 */
class CanvasDebugCorner {
    constructor(lines) {
        this.visible = true
        this.size = lines
        this.debugMsgList = [] /* initialize all elements to empty string */
        for (let i in lines)
            this.debugMsgList[i] = ''
    }

    setText(text, index) {
        if (index >= this.size) {
            this.debugMsgList[0] = `${index} ← index>${this.size} not supported`
        } else this.debugMsgList[index] = text
    }

    showBottom() {
        if (this.visible) {
            noStroke()
            textFont(fixedWidthFont, 14)

            const LEFT_MARGIN = 10
            const DEBUG_Y_OFFSET = height - 10 /* floor of debug corner */
            const LINE_SPACING = 2
            const LINE_HEIGHT = textAscent() + textDescent() + LINE_SPACING

            /* semi-transparent background */
            fill(0, 0, 0, 10)
            rectMode(CORNERS)
            const TOP_PADDING = 3 /* extra padding on top of the 1st line */
            rect(
                0,
                height,
                width,
                DEBUG_Y_OFFSET - LINE_HEIGHT * this.debugMsgList.length - TOP_PADDING
            )

            fill(0, 0, 100, 100) /* white */
            strokeWeight(0)

            for (let index in this.debugMsgList) {
                const msg = this.debugMsgList[index]
                text(msg, LEFT_MARGIN, DEBUG_Y_OFFSET - LINE_HEIGHT * index)
            }
        }
    }

    showTop() {
        if (this.visible) {
            noStroke()
            textFont(fixedWidthFont, 14)

            const LEFT_MARGIN = 10
            const TOP_PADDING = 3 /* extra padding on top of the 1st line */

            /* offset from top of canvas */
            const DEBUG_Y_OFFSET = textAscent() + TOP_PADDING
            const LINE_SPACING = 2
            const LINE_HEIGHT = textAscent() + textDescent() + LINE_SPACING

            /* semi-transparent background, a console-like feel */
            fill(0, 0, 0, 10)
            rectMode(CORNERS)

            rect( /* x, y, w, h */
                0,
                0,
                width,
                DEBUG_Y_OFFSET + LINE_HEIGHT*this.debugMsgList.length/*-TOP_PADDING*/
            )

            fill(0, 0, 100, 100) /* white */
            strokeWeight(0)

            textAlign(LEFT)
            for (let i in this.debugMsgList) {
                const msg = this.debugMsgList[i]
                text(msg, LEFT_MARGIN, LINE_HEIGHT*i + DEBUG_Y_OFFSET)
            }
        }
    }
}