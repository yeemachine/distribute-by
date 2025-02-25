// A Distributor Plugin for Figma
// Richard Yee
// @yeemachine
// https://yee.gd
// Helper Function: Reorder Array of Objects based on Object Value
const compareValues = (key, order = "asc") => {
    return function (a, b) {
        if (!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
            return 0;
        }
        const varA = typeof a[key] === "string" ? a[key].toUpperCase() : a[key];
        const varB = typeof b[key] === "string" ? b[key].toUpperCase() : b[key];
        let comparison = 0;
        if (varA > varB) {
            comparison = 1;
        }
        else if (varA < varB) {
            comparison = -1;
        }
        return order == "desc" ? comparison * -1 : comparison;
    };
};
// Helper Function: Calculate vertices of a rotated rectangle
function getRectFourPoints(x, y, width, height, ang) {
    let rad = ang * (Math.PI / 180);
    let points = {
        first: { x, y },
        second: null,
        third: null,
        fourth: null,
        center: null,
        bounding: {
            width: null,
            height: null,
            x: null,
            y: null,
        },
        offset: {
            x: null,
            y: null,
        },
    };
    const sinAng = Math.sin(rad);
    const cosAng = Math.cos(rad);
    points.second = { x: x + cosAng * width, y: y - sinAng * width };
    points.third = { x: x + sinAng * height, y: y + cosAng * height };
    points.fourth = {
        x: points.second.x + sinAng * height,
        y: points.second.y + cosAng * height,
    };
    points.center = {
        x: (x + points.fourth.x) / 2,
        y: (y + points.fourth.y) / 2,
    };
    points.bounding.width = Math.abs(sinAng) * height + Math.abs(cosAng) * width;
    points.bounding.height = Math.abs(sinAng) * width + Math.abs(cosAng) * height;
    points.bounding.x = points.center.x - points.bounding.width / 2;
    points.bounding.y = points.center.y - points.bounding.height / 2;
    points.offset.x = x - points.bounding.x;
    points.offset.y = y - points.bounding.y;
    return points;
}
function distribute(amount = 0, axis = "x", order = "asc", fromCenter = false) {
    if (figma.currentPage.selection.length > 1) {
        //Global variables
        let counter = 0, nodesSorted = [];
        const ifCenter = fromCenter ? 0.5 : 1;
        //Take current selections and sort by asc or desc
        figma.currentPage.selection.forEach((e) => {
            let calc = getRectFourPoints(e.x, e.y, e.width, e.height, e.rotation);
            nodesSorted.push({
                id: e.id,
                x: calc.bounding.x,
                y: calc.bounding.y,
                width: calc.bounding.width,
                height: calc.bounding.height,
                offset: calc.offset,
                node: e,
            });
        });
        nodesSorted.sort(compareValues(axis, order));
        nodesSorted.forEach((e, i) => {
            let nodeBoundingDim = axis === "x" ? e.width : e.height;
            let nextBoundingDim = axis === "x" && nodesSorted.length > i + 1
                ? nodesSorted[i + 1].width
                : axis === "y" && nodesSorted.length > i + 1
                    ? nodesSorted[i + 1].height
                    : 0;
            if (i === 0) {
                let startCoor = e[axis];
                counter =
                    order === "asc"
                        ? counter + startCoor + nodeBoundingDim * ifCenter + amount
                        : counter + startCoor - amount - nextBoundingDim * ifCenter;
            }
            else {
                e.node[axis] = counter + e.offset[axis]; //Modifies node coordinates
                counter =
                    order === "asc"
                        ? counter + amount + nodeBoundingDim * ifCenter
                        : counter - amount - nextBoundingDim * ifCenter;
            }
        });
    }
    else {
        figma.notify("Select multiple items to distribute.");
    }
}
// Init
(() => {
    // Gets saved config from previous session
    figma.clientStorage
        .getAsync("distributor")
        .then((res) => {
        res = res ? res : { command: figma.command };
        if (figma.command === "repeat") {
            distribute(res.amount, res.axis, res.order, res.fromCenter);
            figma.closePlugin();
        }
        else {
            res.command = figma.command ? figma.command : "x&y";
            figma.ui.postMessage(res);
        }
    })
        .catch((err) => {
        console.log(err);
        figma.ui.postMessage({ command: figma.command });
    });
    // Render UI
    if (figma.command !== "repeat") {
        figma.showUI(__html__, { width: 190, height: 298 });
    }
    // Executes when user submits input
    figma.ui.onmessage = (msg) => {
        if (msg.type === "cancel") {
            figma.closePlugin();
        }
        if (msg.type === "distribute-submit") {
            //Saves user config
            figma.clientStorage.setAsync("distributor", msg.config);
            distribute(msg.config.amount, msg.config.axis, msg.config.order, msg.config.fromCenter);
            if (!msg.config.leaveOpen) {
                figma.closePlugin();
            }
        }
    };
})();
