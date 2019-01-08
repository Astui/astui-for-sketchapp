/**
 * Class for handling tangencies call.
 * This does not require user input at all but has a webview that shows you that processes are running
 * In more complex programs it is possible to get user input, however in here it's
 * useful for the user (Feel free to implement a ui)
 * 
 */
//Getting dependencies 
var UI = require('sketch/ui');
var Settings = require('sketch/settings');
import BrowserWindow from 'sketch-module-web-view';


/**
 * Default method that get executed when the plugin triggers this command
 * Looping through selected elements and on each path selection call tangencies
 * 
 * @param {*} context - selection
 */
export default function (context) {

    const options = {
        identifier: 'tangencies.id',
        width: 350,
        height: 180
      };
      //instantiating the window and getting the webContents object to work with
    const browser = new BrowserWindow(options);
    
    browser.setResizable(false);

    browser.loadURL('./tangencies.html');
  
    let paths = processTangencies(context);

    let newArray = new Array();

    paths.forEach(function(path){
        newArray.push(doMovePointsToTangencies(path));
    });

    Promise.all(newArray).then((s)=> {
        browser.close();
    }).catch(function(error){
        UI.alert("Error",error);
    });
 
}

/**
 * Processing tangencies diving into multiple grouping elements and adding them to the array of all paths
 * 
 * @param {*} context - selection
 * @return array arrayPaths - array of paths
 */
function processTangencies(context) {
    let loopSelection = context.selection;
    let arrayPaths = new Array();
    
    if (loopSelection.length == 0) {
            UI.alert("Error", "No paths are selected");
  
    }
    loopSelection.forEach(layer => {
        if ((layer.class() == MSLayerGroup) || (layer.class() == MSShapeGroup)) {
            let i;
            for (i = 0; i < layer.layers().length; i++) {
                if (layer.layers()[i].class() == MSShapePathLayer) {
                    var path = svgConverter(layer.layers()[i].pathInFrame());
                    arrayPaths.push({"path": path, "obj": layer.layers()[i]});
                } else if ((layer.layers()[i].class() == MSShapeGroup) || (layer.class() == MSLayerGroup)) {
                
                    layer.layers()[i].layers().forEach(element => {
                       
                        if (element.class() == MSShapePathLayer) {
                            var path = svgConverter(element.pathInFrame());
                            arrayPaths.push({"path": path, "obj": element});
  
                        }
                    });
                }
            }
        } else if (layer.class() == MSShapePathLayer) {
                var path = svgConverter(layer.pathInFrame());
                arrayPaths.push({"path": path, "obj": layer});
           
        } 
    });
  
    return arrayPaths;
  
}

/**
 * Converting the Sketch Class into path data
 *  
 * @param {*} obj 
 * 
 * @return {string} svgPath
 */

function svgConverter(obj)
{

    var path = NSBezierPath.bezierPathWithPath(obj);

    var sel = NSSelectorFromString("svgPathAttribute");
    var svg = path.performSelector(sel);
    var svgPath = svg.toString().slice(3, -1);

    return svgPath;
}

/**
 * Hacking method of replacing pathdata in passed object
 * returns a promise chained into the previous method
 * 
 * @param {*} obj 
 */
function moveToTangenciesClosure(obj) {
    return function (data) {
        var isPathClosedPtr = MOPointer.alloc().init();
        var svgProcessedPath = SVGPathInterpreter.bezierPathFromCommands_isPathClosed(data.path, isPathClosedPtr);
  
        var newPath = MSPath.pathWithBezierPath(svgProcessedPath);
        obj.setPathInFrame_(newPath);       
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
function doMovePointsToTangencies(svg) {
    var url = "https://astui.tech/api/v1/tangencies";
    var apiToken = Settings.settingForKey("api_token");
    var content = "path=" + svg.path + "&api_token=" + apiToken + "&accuracy=10&angle=90";

    return fetch(url, {
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
        .then(moveToTangenciesClosure(svg.obj));
}