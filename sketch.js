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


function preload() {
    font = loadFont('data/consola.ttf')
    fixedWidthFont = loadFont('data/consola.ttf')
    variableWidthFont = loadFont('data/meiryo.ttf')
    periodicTableJSON = loadJSON('data/elementsBowserinator.json')
}


function setup() {
    let cnv = createCanvas(1500, 900)
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

    let elementSize = 75 // each element is a square. this is the size of it.
    let padding = 4 // padding for squares.

    let yPos = elementSize*3/2 // we are displaying this in the center.
    let xPos = elementSize*3/4 // the xPos to display the period labels on.
    textAlign(CENTER, CENTER)

    // since we'll be facilitating scrolling, we need to scale everything to
    // the element size. Everything has to depend on that.
    textSize((75/elementSize)*14)
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

        // however, there is an exception with the lanthanides and actinides.
        // the json displays it as period 6 or 7 and group 3, whereas it's
        // actually supposed to be displayed as if it's period 8 or 9 and group
        // 4+.

        // atomic numbers 57-71 correspond to lanthanides (groups 4-18).
        if (element["number"] >= 57 && element["number"] <= 71) {
            let group = element["number"] - 53
            let period = element["period"] + 2
            xPos = group*elementSize
            yPos = period*elementSize
        }

        // atomic numbers 89-103 correspond to actinides (groups 4-18).
        if (element["number"] >= 89 && element["number"] <= 103) {
            let group = element["number"] - 85
            let period = element["period"] + 2
            xPos = group*elementSize
            yPos = period*elementSize
        }

        // now we need to decide the column.
        let type = element["category"]
        fill(0, 0, 20)
        strokeWeight(1)
        stroke(0, 0, 30)
        switch (type) {
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
        square(xPos + padding, yPos + padding, elementSize - padding*2)
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