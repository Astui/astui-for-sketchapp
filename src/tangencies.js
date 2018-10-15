/**
 * Class for handling tangencies call.
 * This does not require user input at all
 * In more complex programs it is possible to get user input, however in here it's
 * useful for the user (Feel free to implement a ui)
 * 
 */
//Getting dependencies 
var UI = require('sketch/ui');
var Settings = require('sketch/settings');
var counter = 0; //setting a counter
var global_error = 200;

/**
 * Default method that get executed when the plugin triggers this command
 * Looping through selected elements and on each path selection call tangencies
 * 
 * @param {*} context - selection
 */
export default function (context) {
    global_error = 200;
    // query selected layers for svg path data
    var loopSelection = context.selection.objectEnumerator(),
        obj;
    while (obj = loopSelection.nextObject()) {
        if (obj.class() == MSShapeGroup) {
            message = message + "Group " + obj.layers().length;
            var i;

            for (i = 0; i < obj.layers().length; i++) {
                if (obj.layers()[i].class() == MSShapePathLayer) {
                    doMovePointsToTangencies(obj.layers()[i]);
                }
            }
        }
        if (obj.class() == MSShapePathLayer) {
            doMovePointsToTangencies(obj);
        }
    }

}

/**
 * Method that replaces the original paths with the new received from the API
 * Instead of just replacing pathdata of each selection, 
 * we define with cocoa script what type of curve each path is and parse it
 * Upon completion we can get alerted that all paths are replaced 
 * 
 * @param {*} obj 
 */
function moveToTangenciesClosure(obj) {
    counter++;
    return function (data) {
        var isPathClosedPtr = MOPointer.alloc().init();
        var svgProcessedPath = SVGPathInterpreter.bezierPathFromCommands_isPathClosed(data.path, isPathClosedPtr);

        var newPath = MSPath.pathWithBezierPath(svgProcessedPath);

        obj.setPathInFrame_(newPath);
        counter--;
        return data;
    }
}

/**
 * Calling the API 
 * We get the path information by getting all vector data from pathInFrame method
 * 1.We send the data
 * 2. we waif for the response
 * 3. we replace paths with that response
 * 
 * @param {*} obj 
 */
function doMovePointsToTangencies(obj) {
    var url = "https://astui.tech/api/v1/tangencies";
    var apiToken = Settings.settingForKey("api_token");
    counter = 0;

    var path = NSBezierPath.bezierPathWithPath(obj.pathInFrame());

    var sel = NSSelectorFromString("svgPathAttribute");
    var svg = path.performSelector(sel);

    // slice off d= and quotes
    var svgPath = svg.toString().slice(3, -1);
    var content = "path=" + svgPath + "&api_token=" + apiToken + "&accuracy=10&angle=90";

    fetch(url, {
            method: 'post',
            headers: {
                "Cache-Control": "no-cache",
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"

            },
            body: content
        })
        .then(
            function (response) {

                if (response.status !== 200) {
                    throw response;
                }

                return response.json();
            }
        )
        .then(moveToTangenciesClosure(obj))
        .catch(function (error) {
            //Handling the thrown error. Since we got the whole response, we can set appropriate error message straight out of the response
            if (global_error == 200) {
                UI.alert("Error", error.status + ": " + error.statusText);
                global_error = error.status; //sets the var letting us only see one alert. 

            }
        });
}