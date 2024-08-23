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

// the num neutrons in each element, including Deuterium
let numNeutrons = [
    0, 1, 2, 4, 5, 6, 6, 7, 8, 10, 10,
    12, 12, 14, 14, 16, 16, 18, 22, 20, 20,
    24, 26, 28, 28, 30, 30, 32, 30, 34, 34,
    38, 42, 42, 46, 44, 48, 48, 50, 50, 50,
    52, 56, 55, 58, 58, 60, 60, 66, 66, 70,
    70, 78, 74, 78, 78, 78, 82, 82, 82, 82,
    82, 84, 90, 90, 94, 94, 98, 98, 98, 100,
    104, 104, 108, 108, 110, 112, 116, 116, 117, 122,
    124, 126, 126, 126, 125, 136, 136, 138, 138, 142,
    140, 146, 144, 150, 148, 151, 150, 153, 153, 157,
    157, 157, 159, 163, 165, 165, 163, 169, 169, 171,
    171, 173, 173, 175, 175, 177, 177, 176]

// The cursor displays only half a second every second.
// Without this variable, we sometimes wouldn't be able to see our cursor
// when moving. This represents the base milliseconds that we offset the
// cursor display by. This way, whenever we're moving, we can reset the
// cursor display such that
let cursorDisplayBaseMillis = 0

function preload() {
    font = loadFont('data/consola.ttf') // the font we'll be using
    fixedWidthFont = loadFont('data/consola.ttf') // this is the same as "font"
    variableWidthFont = loadFont('data/meiryo.ttf') // another font option

    // load the json
    periodicTableJSON = loadJSON('data/elementsBowserinator.json', processData)
}

// on the data, do the following:
// 1. replace the bohr model image link with the actual image, not that we're using it
// 2. download all 119 element images in the elementImages file
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

    let padding = 4*elementSize/75 // padding for...almost everything.

    let yPos = elementSize*3/2 // we are displaying this in the center.
    let xPos = elementSize*3/4 // the xPos to display the period labels on.
    textAlign(CENTER, CENTER)

    // since we'll be facilitating changing window size, we need to scale
    // everything to the element size. Everything has to depend on that.
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
    // we check for whether the element matches the search bar, so we'll
    // want to create the variable.
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
        // 4-18 depending on which lanthanide/actinide it is and which
        // category the element is in.

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
        // for now, they're just variables for displaying the square.
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
        // if it is we just update the selectedElement, which is equal to
        // the index of the element in the json (i).
        if (mouseIsPressed &&
            mouseX > leftXPos && mouseX < rightXPos &&
            mouseY > topYPos && mouseY < bottomYPos) {
            selectedElement = i
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
    // element 120, but who knows?) and the first lanthanide/actinide
    // we have an increased y padding (multiplied by 1.5); otherwise it looks
    // weird
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

    // however we will need to do some considerations on where to display
    // newlines. every 100 characters there should be a newline after the
    // previous word.
    // this is similar to my code from typerc, but with textWidth() instead
    // of using a fixed number of characters. this is effectively the same
    // in a monospace font.
    let summary = selectedElementData["summary"]
    let summaryWithNewlines = ""
    let charsSinceLastNewline = 0
    for (let char of summary) {
        charsSinceLastNewline += 1

        // add a newline at the beginning of the last word for every 100
        // characters. in other words, replace the last space with a newline.
        if (charsSinceLastNewline === 100) {
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
    text(summaryWithNewlines, elementSize*3 + padding, 0)
    textStyle(NORMAL)

    // now we display the example image of the element
    let exampleImage = elementImages[selectedElementData["name"]]
    image(exampleImage, elementSize*6 + 5, elementSize*1.5,
          elementSize*2, elementSize*2)

    // make the image fade to black by drawing increasingly opaque black-stroked
    // rectangles
    // the alpha is designed to increase to 100.
    // the vignette helps white backgrounds blend in with the dark blue
    // background. in some cases it looks weird. note that this might help
    // focus on what is supposed to be focused on, like for Neptunium.
    let alpha = -78
    let imageSize = elementSize*2
    let imageCenterXPos = elementSize*6 + 5 + imageSize/2
    let imageCenterYPos = elementSize*1.5 + imageSize/2
    for (let distanceFromImageCenter = 0; distanceFromImageCenter < elementSize; distanceFromImageCenter += elementSize/100) {
        stroke(0, 0, 0, alpha)
        strokeWeight(min(6*elementSize/75, (elementSize - distanceFromImageCenter) + 2))
        noFill()
        rect(imageCenterXPos - distanceFromImageCenter,
            imageCenterYPos - distanceFromImageCenter,
            distanceFromImageCenter*2)

        alpha += 1.22
    }

    noStroke()

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
    fill(0, 0, 100)
    text(imageTitleWithNewlines, elementSize*8.1, elementSize*1.5)

    // now we display a Lewis diagram of the element over a black background.
    imageSize = elementSize*2
    let imageLeftXPos = elementSize*4
    let imageTopYPos = elementSize*1.5
    imageCenterXPos = imageLeftXPos + imageSize/2
    imageCenterYPos = imageTopYPos + imageSize/2
    let imageRightXPos = imageLeftXPos + imageSize
    let imageBottomYPos = imageTopYPos + imageSize
    textAlign(CENTER, CENTER)

    // make the background
    fill(0, 0, 0)
    square(imageLeftXPos, imageTopYPos, imageSize, 5)

    // display the chemical symbol in the center over a green circle
    fill(300, 50, 50)
    circle(imageCenterXPos, imageCenterYPos, elementSize)
    textSize(elementSize*2/3)
    fill(0, 0, 100)

    // if the symbol contains a lowercase g, y, or p, that means it goes
    // under the baseline. those, we want to display a touch higher.
    if (selectedElementData["symbol"][1] === "g" ||
        selectedElementData["symbol"][1] === "p" ||
        selectedElementData["symbol"][1] === "y")
        text(selectedElementData["symbol"], imageCenterXPos, imageCenterYPos - 5*elementSize/75)
    else
        // otherwise, just display it normally. note that the center of the
        // text doesn't align properly so it being a tiny bit higher will
        // help center it.
        text(selectedElementData["symbol"], imageCenterXPos, imageCenterYPos - 2*elementSize/75)
    textAlign(LEFT, TOP)

    let electrons = selectedElementData["shells"]
    let numValenceElectrons = electrons[electrons.length - 1]

    stroke(0, 0, 100)
    noFill()
    strokeWeight(9*elementSize/75)
    let distFromCenter = 2*elementSize/3

    // top electrons: display 1 dot for 1-4 electrons, 2 dots for 5-8 electrons
    // display 2 dots for Helium even with 2 electrons, due to there only
    // being 1 electron pair
    if (numValenceElectrons >= 1 && numValenceElectrons <= 4 && selectedElementData["name"] !== "Helium") {
        point(imageCenterXPos, imageCenterYPos - distFromCenter)
    } if (numValenceElectrons >= 5 || selectedElementData["name"] === "Helium") {
        point(imageCenterXPos - elementSize/5, imageCenterYPos - distFromCenter)
        point(imageCenterXPos + elementSize/5, imageCenterYPos - distFromCenter)
    }

    // right electrons: display 1 dot for 2-5 electrons, 2 dots for 6-8 electrons
    // don't display a first dot for Helium even with 2 electrons. that
    // would mean a second electron pair, which doesn't exist for the 1s
    // orbital.
    if (numValenceElectrons >= 2 && numValenceElectrons <= 5 && selectedElementData["name"] !== "Helium") {
        point(imageCenterXPos + distFromCenter, imageCenterYPos)
    } if (numValenceElectrons >= 6) {
        point(imageCenterXPos + distFromCenter, imageCenterYPos - elementSize/5)
        point(imageCenterXPos + distFromCenter, imageCenterYPos + elementSize/5)
    }

    // bottom electrons: display 1 dot for 3-6 electrons, 2 dots for 7-8 electrons
    if (numValenceElectrons >= 3 && numValenceElectrons <= 6) {
        point(imageCenterXPos, imageCenterYPos + distFromCenter)
    } if (numValenceElectrons >= 7) {
        point(imageCenterXPos - elementSize/5, imageCenterYPos + distFromCenter)
        point(imageCenterXPos + elementSize/5, imageCenterYPos + distFromCenter)
    }

    // left electrons: display 1 dot for 4-7 electrons, 2 dots for 8 electrons
    if (numValenceElectrons >= 4 && numValenceElectrons <= 7) {
        point(imageCenterXPos - distFromCenter, imageCenterYPos)
    } if (numValenceElectrons >= 8) {
        point(imageCenterXPos - distFromCenter, imageCenterYPos - elementSize/5)
        point(imageCenterXPos - distFromCenter, imageCenterYPos + elementSize/5)
    }

    // we've finished with the periodic table and the non-detailed
    // description of the selected element.
    // below that we're going to add some of the properties of that element.
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
    // or, if the text in the search box is exactly one of those matches.
    for (let match of matches) {
        let name = periodicTableJSON["elements"][match - 1]["name"]
        if (textInSearchBar.toLowerCase() === name.toLowerCase()) {
            matches = [match]
        }
    }
    if (matches.length === 1) {
        background(234, 34, 24)

        // padding is quite a bit larger in here
        let padding = 8*elementSize/75

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
        let imageData = selectedElementData["image"]
        let imageTitle = imageData["title"]
        let displayImage = elementImages[name]
        let block = selectedElementData["block"]

        // draw a big version of the element square at the bottom-left.
        // now we need to decide the color
        // same thing as last time. comments just as refresher.
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
        // it's more like an element rectangle; there's not enough properties
        // to display for a square as large as elementSize*3, so I've halved
        // the height. for consistent padding it needs to be a little less
        // than half.
        textSize(16*(elementSize/75))
        let squareSize = elementSize*3 - padding
        let leftXPos = padding
        let topYPos = padding + textAscent() + textDescent()
        let rightXPos = leftXPos + squareSize
        let bottomYPos = topYPos + 49*squareSize/100 // not exactly half height.
        rectMode(CORNER)
        rect(leftXPos, topYPos, squareSize, 49*squareSize/100)

        // display the atomic number (top-left)
        textSize(13*(elementSize/75))
        noStroke()
        fill(0, 0, 100)
        textAlign(LEFT, TOP)
        text(z, leftXPos + padding, topYPos + padding)

        // and the atomic mass (top-right)
        textAlign(RIGHT, TOP)
        text(averageMass, rightXPos - padding, topYPos + padding)

        // and the symbol (left)
        textAlign(LEFT, TOP)
        textSize(70*(elementSize/75))
        text(chemSymbol, leftXPos + padding/2, topYPos + padding + 13*(elementSize/75))

        // and the name (right)
        textAlign(RIGHT, TOP)
        textSize(10*(elementSize/75))
        text(name, rightXPos - padding, topYPos + padding + 16*(elementSize/75))

        // after that we add "normal state" + "category" (right)
        // for example, "Solid alkali metal" or "Liquid transition metal"
        // or "Gaseous diatomic nonmetal"
        text(normalState + " " + category,
             rightXPos - padding, topYPos + padding + 29*(elementSize/75))

        // after that we add the electronegativity (right)
        text("Electronegativity: " + electronegativity,
             rightXPos - padding, topYPos + padding + 42*(elementSize/75))

        // then the density. (right)
        // density is in grams per liters for gasses, and grams per cubed
        // centimeters for solids and liquids
        // or if the density is "null", just display Density: null
        if (density !== null) {
            text("Density: " + density +
                ((normalState === "Gaseous") ? "g/l" : "g/cm³"),
                rightXPos - padding, topYPos + padding + 55 * (elementSize / 75))
        } else {
            text("Density: null",
                 rightXPos - padding, topYPos + padding + 55 * (elementSize / 75))
        }

        // the period and group as well
        text("Period: " + period + ", group: " + group,
             rightXPos - padding, topYPos + padding + 68*(elementSize/75))

        // then we add the electron config semantic, ex *[Rn] 5f14 6d10 7s2
        // 7p6 (bottom)
        textAlign(RIGHT, BOTTOM)
        text("e⁻ config: " + electronConfig, rightXPos - padding,
             bottomYPos - padding)
        textAlign(LEFT, TOP)


        // display the example image of the element, size equal to element
        // box size
        image(displayImage, rightXPos + padding, 0, elementSize*3, elementSize*3)

        // then display a bohr model.
        // first we start with a black square for the border of the bohr
        // model image.
        let protons = z
        let neutrons = numNeutrons[matches[0] - 1]
        let imageSize = elementSize*3
        let imageLeftXPos = rightXPos + padding*2 + elementSize*3
        let imageTopYPos = 0
        let imageMiddleXPos = imageLeftXPos + squareSize/2
        let imageMiddleYPos = imageTopYPos + squareSize/2
        let imageRightXPos = imageLeftXPos + squareSize
        let imageBottomYPos = imageTopYPos + squareSize
        let electronDiameter = 8*elementSize/75
        let nucleusDiameter = 80*elementSize/75
        let orbitalOneDiameter = 100*elementSize/75
        let orbitalTwoDiameter = 120*elementSize/75
        let orbitalThreeDiameter = 140*elementSize/75
        let orbitalFourDiameter = 160*elementSize/75
        let orbitalFiveDiameter = 180*elementSize/75
        let orbitalSixDiameter = 200*elementSize/75
        let orbitalSevenDiameter = 220*elementSize/75
        let electronShells = selectedElementData["shells"]

        // because the nucleus diameter stays the same but the number of
        // protons and neutrons don't, something else has to adjust. in this
        // case, the nucleon diameter.
        let nucleonDiameter = 3.2*elementSize/75
        if (z > 65) {
            nucleonDiameter = 3.2*elementSize/75
        } else if (z > 45) {
            nucleonDiameter = 4*elementSize/75
        } else if (z > 30) {
            nucleonDiameter = 5*elementSize/75
        } else if (z > 20) {
            nucleonDiameter = 6*elementSize/75
        } else if (z > 10) {
            nucleonDiameter = 9*elementSize/75
        } else if (z > 6) {
            nucleonDiameter = 13*elementSize/75
        } else if (z > 4) {
            nucleonDiameter = 14*elementSize/75
        } else if (z === 4) {
            nucleonDiameter = 16*elementSize/75
        } else if (z === 3) {
            nucleonDiameter = 18*elementSize/75
        } else if (z === 2) {
            nucleonDiameter = 23*elementSize/75
        } else if (z === 1) {
            nucleonDiameter = 28*elementSize/75
        }

        fill(0, 0, 0)
        noStroke()
        square(imageLeftXPos, imageTopYPos, imageSize, 10*elementSize/75)

        // then we display a purple circle under the nucleus's protons and
        // neutrons for the background of the nucleus
        fill(300, 50, 50)
        circle(imageMiddleXPos, imageMiddleYPos, nucleusDiameter)

        // draw the requisite protons and neutrons in a sunflower seed pattern
        let angleIncrement = PI * (3 - sqrt(5)) // golden angle
        let maxRadius = nucleusDiameter/2 - nucleonDiameter/2
        for (i = 0; i < protons + neutrons; i++) {
            let r = sqrt(i/(protons + neutrons)) * maxRadius
            let angle = angleIncrement*i + (millis()/10000)*r
            let x = cos(angle) * r + imageMiddleXPos
            let y = sin(angle) * r + imageMiddleYPos

            if (i % 2 === 0 && i/2 < protons) {
                fill(20, 100, 50) // red for protons
                noStroke()
            } else {
                fill(240, 100, 50) // blue for neutrons
                noStroke()
            }

            circle(x, y, nucleonDiameter)
        }

        // then we display a white-stroked circle representing each orbital
        // or, technically not orbitals, but n=1 to n=7, those rings. (shells)
        // we only display these rings if the electrons actually go there.
        // for example, for hydrogen-helium, we display only the first ring,
        // but from rubidium to xenon, we display 5 out of 7 rings. that's
        // still not all of them; only when we reach the last period
        // (francium to oganesson) do we display all 7.
        // palladium technically has 0 valence electrons, so we display its
        // 4th shell even though there is no 4s shell.
        noFill()
        stroke(0, 0, 100)
        circle(imageMiddleXPos, imageMiddleYPos, orbitalOneDiameter)
        if (electronShells.length > 1) circle(imageMiddleXPos, imageMiddleYPos, orbitalTwoDiameter)
        if (electronShells.length > 2) circle(imageMiddleXPos, imageMiddleYPos, orbitalThreeDiameter)
        if (electronShells.length > 3) circle(imageMiddleXPos, imageMiddleYPos, orbitalFourDiameter)
        if (electronShells.length > 4) circle(imageMiddleXPos, imageMiddleYPos, orbitalFiveDiameter)
        if (electronShells.length > 5) circle(imageMiddleXPos, imageMiddleYPos, orbitalSixDiameter)
        if (electronShells.length > 6) circle(imageMiddleXPos, imageMiddleYPos, orbitalSevenDiameter)

        // now display each electron as a small yellowish green circle
        let shellNum = 1
        fill(90, 50, 100)
        noStroke()

        // if the first shell is already the valence electrons, make it red
        if (electronShells.length === 1) fill(0, 50, 100)

        for (let electronsPerShell of electronShells) {
            // first we have to find the orbital diameter
            let currentOrbitalDiameter = 0
            switch (shellNum) {
                case 1:
                    currentOrbitalDiameter = orbitalOneDiameter
                    break
                case 2:
                    currentOrbitalDiameter = orbitalTwoDiameter
                    break
                case 3:
                    currentOrbitalDiameter = orbitalThreeDiameter
                    break
                case 4:
                    currentOrbitalDiameter = orbitalFourDiameter
                    break
                case 5:
                    currentOrbitalDiameter = orbitalFiveDiameter
                    break
                case 6:
                    currentOrbitalDiameter = orbitalSixDiameter
                    break
                case 7:
                    currentOrbitalDiameter = orbitalSevenDiameter
                    break
            }

            // electronsPerShell is the number of electrons in the shell
            // n=shellNum. we need to display that many electrons (spread
            // evenly) in the circle.
            let angleBetweenElectrons = TWO_PI/electronsPerShell

            // to make it interesting we create an offset in the angle that
            // moves over time. It moves slower each time, and in order to
            // not create a super weird effect, each shell has to move
            // opposite direction.
            let offset = PI/2 + millis()*TWO_PI/(4000)*((-0.8)**shellNum)

            // now that we have the angle between each electron, we can
            // display the small electron circles.
            if (electronsPerShell !== 0) {
                for (let angle = offset; angle < TWO_PI + offset; angle += angleBetweenElectrons) {
                    let x = cos(angle) * currentOrbitalDiameter / 2 + imageMiddleXPos
                    let y = sin(angle) * currentOrbitalDiameter / 2 + imageMiddleYPos
                    noStroke()
                    circle(x, y, electronDiameter)

                    // display a small minus within
                    stroke(0, 0, 0)
                    strokeWeight(1)
                    line(x - 2 * elementSize / 75, y, x + 2 * elementSize / 75, y)
                }
            }

            shellNum++

            // if we've reached the last shellNum we switch to a pastel red
            // color to represent valence electrons
            if (shellNum === electronShells.length) fill(0, 50, 100)

            // if it's the second-to-last we switch to a pastel cyan color
            if (shellNum === electronShells.length - 1) fill(170, 50, 100)

            // if it's the third-to-last we switch to a pastel teal color
            if (shellNum === electronShells.length - 2) fill(140, 50, 100)

            // if it's the fourth-to-last we switch to a yellowish green
            // color
            if (shellNum === electronShells.length - 3) fill(110, 50, 100)
        }

        // display the title of the image
        // very similar to the other times we wrapped text
        let imageTitleWithNewlines = ""
        let charsSinceLastNewline = 0
        for (let char of imageTitle) {
            charsSinceLastNewline += 1

            // add the newline for every 38 characters. Only during a space
            // after a word/sentence.
            if (charsSinceLastNewline >= 38){
                let lastIndex = imageTitleWithNewlines.lastIndexOf(" ")
                imageTitleWithNewlines =
                    imageTitleWithNewlines.substring(0, lastIndex) + "\n" +
                    imageTitleWithNewlines.substring(lastIndex + 1)

                charsSinceLastNewline = imageTitleWithNewlines.length - lastIndex
            }

            // we add the char
            imageTitleWithNewlines += char
        }
        fill(0, 0, 100)
        text(imageTitleWithNewlines, rightXPos + padding, elementSize*3 + padding)

        // then display the bohr model image title
        // there is no explicit title, but we can say "Bohr model image"
        text("Bohr model image", rightXPos + padding*2 + elementSize*3, elementSize*3 + padding)

        // make the image fade to black by drawing increasingly opaque black
        // rectangles
        // very similar to last time wedisplayed an image and wanted it to
        // fade to black
        let alpha = -78
        imageSize = elementSize*3
        let imageCenterXPos = rightXPos + padding + imageSize/2
        let imageCenterYPos = imageSize/2
        for (let distanceFromImageCenter = 0; distanceFromImageCenter < elementSize*1.5; distanceFromImageCenter += 1.5*elementSize/100) {
            stroke(0, 0, 0, alpha)
            strokeWeight(min(12*elementSize/75, (elementSize*1.5 - distanceFromImageCenter) + 4))
            noFill()
            rect(imageCenterXPos - distanceFromImageCenter,
                 imageCenterYPos - distanceFromImageCenter,
                 distanceFromImageCenter*2)

            alpha += 1.22
        }

        // add the summary of the element
        // same thing here about wrapping, except 123 characters
        let summaryWithNewlines = ""
        charsSinceLastNewline = 0
        for (let char of summary) {
            charsSinceLastNewline += 1

            // add a newline at the beginning of the last word for every 123
            // characters. in other words, replace the last space with a newline.
            if (charsSinceLastNewline === 123) {
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
        fill(0, 0, 100)
        noStroke()
        textSize(12*elementSize/75)
        text(summaryWithNewlines, elementSize*9 + padding*3, 0)
        textStyle(NORMAL)

        // then display all the ionization energies just below the large
        // element rectangle. the num ionization energies will range anywhere
        // from 0 (transactinoids) to 30 (molybdenum), but luckily we have
        // enough room for that.
        // we should limit the number of ionization energies to 10
        textSize(15*elementSize/75)
        if (ionizationEnergies.length > 10) {
            ionizationEnergies = [
                ionizationEnergies[0], ionizationEnergies[1],
                ionizationEnergies[2], ionizationEnergies[3],
                ionizationEnergies[4], ionizationEnergies[5],
                ionizationEnergies[6], ionizationEnergies[7],
                ionizationEnergies[8], ionizationEnergies[9]
            ]
        }
        if (ionizationEnergies.length > 0) {
            text("Ionization energies:\n" + join(
                ionizationEnergies, "\n"),
                padding, bottomYPos + padding)
        } else {
            text("Ionization energies: null",
                padding, bottomYPos + padding)
        }
    }

    // at the top-left we always have the search box.
    // we'll be situating this such that it touches the corner.
    fill(0, 0, 25)
    stroke(0, 0, 50)
    strokeWeight(1)
    textSize(16*(elementSize/75))
    rect(0, 0, elementSize*3, textAscent() + textDescent())

    // then display a magnifying glass at the left.
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

    // after 300 seconds (5 minutes), stop the sketch
    if (frameCount > frameRate()*300) {
        noLoop()
        instructions.html(`<pre>
            sketch stopped</pre>`)
    }

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

    // we can type in the search bar, any letter. limit of 30 characters
    // case doesn't matter, but just to make sure people don't get confused,
    // the letters will be typed in as their original case.
    if (["a", "b", "c", "d", "e", "f", "g",
         "h", "i", "j", "k", "l", "m", "n",
         "o", "p", "q", "r", "s", "t",
         "u", "v", "w", "x", "y", "z"]
        .includes(key.toLowerCase()) &&
        textInSearchBar.length < 23) {
        // insert a letter into the search bar
        textInSearchBar =
            textInSearchBar.substring(0, searchCursor) +
            key +
            textInSearchBar.substring(searchCursor)

        // at the end we're always moving the cursor to the right
        searchCursor += 1

        cursorDisplayBaseMillis = millis()
    }
    // or delete, as long as the cursor isn't already at the start
    if (keyCode === BACKSPACE && searchCursor > 0) {
        searchCursor -= 1
        textInSearchBar =
            textInSearchBar.substring(0, searchCursor) +
            textInSearchBar.substring(searchCursor + 1)
        cursorDisplayBaseMillis = millis()
    }
    // or go left/right, assuming the cursor won't go out of the text
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