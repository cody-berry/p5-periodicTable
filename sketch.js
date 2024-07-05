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

function preload() {
    font = loadFont('data/consola.ttf') // the font we'll be using
    fixedWidthFont = loadFont('data/consola.ttf') // this is the same as "font"
    variableWidthFont = loadFont('data/meiryo.ttf') // another font option
    periodicTableJSON = loadJSON('data/elementsBowserinator.json', processData)
}

function processData(data) {
    // now we iterate through everything in elements, and we replace each
    // image with an actual loaded image.
    let index = 0
    for (let element of data["elements"]) {
        data["elements"][index]["bohr_model_image"] =
            loadImage(data["elements"][index]["bohr_model_image"])

        // for some elements the image isn't found or the image cannot be
        // accessed.
        // because we are loading an image, we'll have to use new Image()
        // because try-catch blocks are synchronous
        data["elements"][index]["image"]["image"] = new Image()
        data["elements"][index]["image"]["image"].onload = function() {
            // Image has loaded successfully
            data["elements"][index]["image"]["image"] =
                loadImage(data["elements"][index]["image"]["url"])
        }
        data["elements"][index]["image"]["image"].onerror = function() {
            // in error cases we'll ask the user to go look up the url
            // themselves
            data["elements"][index]["image"]["lookup_instructions"] =
                "Please look up " + data["elements"][index]["image"]["url"] +
                "yourself. My sketch won't allow me to do it. Thanks :D!"
        }
        data["elements"][index]["image"]["image"].src =
            data["elements"][index]["image"]["url"]

        index += 1
    }
    print(data)
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
    let yPoses = [1, 2, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 2, 2, 2, 2, 2, 1]
    xPos = elementSize*3/2
    for (let group = 1; group <= 18; group += 1) {
        text(group, xPos, (yPoses[group - 1] - 1/4)*elementSize)
        xPos += elementSize
    }

    // now we display a square for each element
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

        // now we need to decide the column.
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

        // now we check if the mouse is clicking on it.
        // it is much harder to do this when we don't already know where the
        // square is. we know right now, so we should take the chance.
        if (mouseIsPressed &&
            mouseX > leftXPos && mouseX < rightXPos &&
            mouseY > topYPos && mouseY < bottomYPos) {
            selectedElement = z
            print(selectedElement)
        }
    }

    // draw the parrellelegram between the last two alkaline earth metals (at
    // least, until the eight alkaline earth metal is releast. It should be
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
    // index in periodicTableJson["elements"], except plus 1.
    let selectedElementData = periodicTableJSON["elements"][selectedElement - 1]

    // display the summary of the element
    textSize(15*elementSize/75)
    fill(0, 0, 100)
    noStroke()

    // however we will need to do some considerations on what to display.
    // every 50 characters there should be a newline after the next word.
    let summary = selectedElementData["summary"]
    let summaryWithNewlines = ""
    let index = 0
    let numNewlines = 0
    for (let char of summary) {
        index += 1

        // add the newline for every 50 characters. Only during a space
        // after a word/sentence.
        if (index >= 50 && char === " "){
            summaryWithNewlines += "\n"
            index = 0
            numNewlines += 1
        }

        // otherwise just add the char
        else summaryWithNewlines += char
    }

    text(summaryWithNewlines, width/2, (numNewlines*8.5 + 15)*elementSize/75)


    /* debugCorner needs to be last so its z-index is highest */
    debugCorner.setText(`frameCount: ${frameCount}`, 2)
    debugCorner.setText(`fps: ${frameRate().toFixed(0)}`, 1)
    debugCorner.showBottom()

    if (frameCount > 36000)
        noLoop()
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