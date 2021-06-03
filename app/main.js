/**
 * load event
 */
window.onload = () => {
    init();
};

/**
 * global vars
 */
let data;
let debug = location.href.includes("debug=true");
let query = location.search
    .slice(1)
    .split("&")
    .map((a) => ({ key: a.split("=")[0], value: a.split("=")[1] }))
    .find((a) => a.key == "speed");
let speed = query == undefined ? 1 : +query.value;
let lastTime;

/**
 * init fn
 *
 * Extract data from CSV
 * Instantiate LoopExtractionModule
 * Append ExtractorModules
 * Kickstart timer
 */
const init = async () => {
    await extractData();

    loop = new LoopExtractionModule();
    loop.append(new ExtractionModuleNames("#entities_terms"))
        .append(new ExtractionModuleTerms("#specialistic_terms"))
        .append(new ExtractionModuleNumbers("#numeric_terms"))
        .start({ debug });
};

/**
 * Extract data from CSV
 */
const extractData = async () => {
    const config = {
        header: true,
    };
    data = await fetch("app/models/terms.csv")
        .then((d) => d.text())
        .then((d) => Papa.parse(d, config).data);

    lastTime = stringToTimeStamp(
        data
            .map((d) => d["Time stamp"])
            .sort()
            .slice(-1)[0]
    );
};

/**
 *
 */
const stringToTimeStamp = (dateAsString) => {
    const finalDateArr = dateAsString.split(":").map((a) => +a);
    const timeStamp = new Date(
        (finalDateArr[0] * 60 + finalDateArr[1]) * 1000
    ).getTime();
    return timeStamp;
};

/**
 * LoopExtractionModule
 *
 * Singleton Object.
 * Initiates ticker and propagates data to Extractors
 * based on data type
 */
class LoopExtractionModule {
    constructor() {
        this.components = [];
        this.timer;
        this.initialTimeStamp;
    }
    start({ debug }) {
        this.initialTimeStamp = new Date().getTime();
        const timeStamp =
            (new Date().getTime() - this.initialTimeStamp) * speed;

        if (debug) {
            data.forEach((dItem) => {
                const timeStamp = stringToTimeStamp(dItem["Time stamp"]);
                this.propagateTick(timeStamp);
            });
        } else {
            this.timer = setInterval(() => {
                const timeStamp =
                    (new Date().getTime() - this.initialTimeStamp) * speed;
                this.propagateTick(timeStamp);
                if (timeStamp > lastTime) {
                    clearInterval(this.timer);
                }
            }, 1000 / speed);
        }
    }
    append(component) {
        this.components.push(component);
        return this;
    }
    propagateTick(timeStamp) {
        const date = new Date(timeStamp);
        const minutes = date.getMinutes();
        const seconds = date.toISOString().substr(17, 2);
        const timeStampString = `${minutes}:${seconds}`;
        const dataToSend = data.find((d) => d["Time stamp"] == timeStampString);
        const dataToSendIndex = data.findIndex(
            (d) => d["Time stamp"] == timeStampString
        );

        console.log("Timer: " + timeStampString);
        console.log(dataToSend);

        if (dataToSend) {
            switch (dataToSend["Type"]) {
                case "Named entity":
                    this.components[0].tick(dataToSend);
                    break;
                case "Terms":
                    this.components[1].tick(dataToSend);
                    break;
                case "Numbers":
                    this.components[2].tick(dataToSend);
                    break;
                default:
            }
        }
    }
}

/**
 * Abstract class defining Modules
 */
class AbstractExtractionModule {
    constructor(root) {
        this.lastRenderedIndex = -1;
        this.lastGridPosition = -1;
        this.gridBlocks = [null, null, null, null];

        this.$root = document.querySelector(root);
        this.$root.innerHTML = "";
    }
    tick(dataReceived) {
        const whosAlreadyRendered = this.isAlreadyRendered(dataReceived);
        this.setAllToUnactive();

        if (whosAlreadyRendered == null) {
            this.lastRenderedIndex++;
            this.lastGridPosition++;
            this.renderElementByIndex(dataReceived);
        } else {
            void whosAlreadyRendered.offsetWidth;
            whosAlreadyRendered.classList.add("newTerm");
        }
    }
    renderElementByIndex(dataReceived) {
        let $el = document.createElement("div");
        $el.classList.add("term");
        $el.classList.add("newTerm");
        $el.style.gridRowStart = (this.lastGridPosition % 4) + 1;
        $el.style.gridColumnStart = 1;
        $el.innerHTML = this.createInnerHTML(dataReceived);

        this.$root.appendChild($el);
        this.setPlacingAlgorithm($el);
        this.collectGarbage();
    }
    setPlacingAlgorithm($el) {
        const isTwoLines =
            $el.querySelector(".target_text, .number_text").clientHeight > 20;
        this.gridBlocks[this.lastGridPosition % 4] = $el;

        if (isTwoLines) {
            $el.classList.add("double");
            this.lastGridPosition++;
            this.gridBlocks[this.lastGridPosition % 4] = $el;
        }
        for (let i = 0; i < 4; i++) {
            if (this.lastGridPosition % 4 == i) {
                if (this.gridBlocks[i + 1]) {
                    this.gridBlocks[i + 1].classList.add("ellipsis");
                    this.gridBlocks[i + 1].style.gridRowStart = i + 2;
                }
            }
        }
        if (isTwoLines && this.lastGridPosition % 4 == 0) {
            this.gridBlocks[3].style.gridRowStart = 3;
            this.lastGridPosition--;
        }
    }
    createInnerHTML(dataReceived) {
        return `
            <div class="newIndicator"></div>
            <div class="termText ">
                <span class="source_text">${
                    dataReceived["Target"] ? dataReceived["Source"] : ""
                }</span>
                <span class="target_text">${
                    dataReceived["Target"]
                        ? dataReceived["Target"]
                        : dataReceived["Source"]
                }</span>
            </div>
        `;
    }
    setAllToUnactive() {
        this.gridBlocks
            .filter((gb) => gb != null)
            .forEach((gb) => {
                gb.classList.remove("newTerm");
            });
    }
    collectGarbage() {
        this.$root.querySelectorAll(".term").forEach(($block) => {
            if (!this.gridBlocks.includes($block) && $block)
                $block.outerHTML = "";
        });
    }
    isAlreadyRendered(dataReceived) {
        let gbOut = null;

        const isNamedOrTerm = ["Named entity", "Terms"].includes(
            dataReceived["Type"]
        );
        const isNumber = ["Numbers"].includes(dataReceived["Type"]);

        const renderedSource =
            isNamedOrTerm && dataReceived["Target"]
                ? dataReceived["Source"]
                : "";
        const renderedTarget =
            isNamedOrTerm && dataReceived["Target"]
                ? dataReceived["Target"]
                : dataReceived["Source"];
        const renderedSourceMatches = (gb) =>
            gb && renderedSource == gb.querySelector(".source_text").innerHTML;
        const renderedTargetMatches = (gb) =>
            gb && renderedTarget == gb.querySelector(".target_text").innerHTML;

        const renderedNumberTarget =
            isNumber && dataReceived["Target"] ? dataReceived["Target"] : "";
        const renderedNumberPosition =
            isNumber && dataReceived["Position"]
                ? dataReceived["Position"]
                : "";
        const renderedNumberTargetMatches = (gb) =>
            gb &&
            renderedNumberTarget == gb.querySelector(".number_text").innerHTML;
        const renderedNumberPositionMatches = (gb) =>
            gb &&
            renderedNumberPosition ==
                gb.querySelector(".referent_text").innerHTML;

        if (isNamedOrTerm) {
            this.gridBlocks.forEach((gb, i) => {
                if (renderedSourceMatches(gb) && renderedTargetMatches(gb))
                    gbOut = gb;
            });
        }
        if (isNumber) {
            this.gridBlocks.forEach((gb, i) => {
                if (
                    renderedNumberTargetMatches(gb) &&
                    renderedNumberPositionMatches(gb)
                )
                    gbOut = gb;
            });
        }

        return gbOut;
    }
}

/**
 * Modules based on type
 */
class ExtractionModuleNames extends AbstractExtractionModule {}
class ExtractionModuleTerms extends AbstractExtractionModule {}
class ExtractionModuleNumbers extends AbstractExtractionModule {
    createInnerHTML(dItem) {
        super.createInnerHTML(dItem);
        return `
            <div class="newIndicator">

            </div>
            <div class="termText">
                <span class="number_text">${dItem["Target"]}</span>
                <span class="referent_text">${dItem["Position"]}</span>
            </div>
        `;
    }
}
