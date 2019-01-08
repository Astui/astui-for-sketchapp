/**
 * Class for handling offset call 
 * 1. Getting the UI and data from the user
 * 2. Gets all the paths from the artboard
 * 3. Redraws path-by-path after completing the Promise 
 */

//Getting dependencies 
const UI = require('sketch/ui');
const Settings = require('sketch/settings');

import BrowserWindow from 'sketch-module-web-view';

export default function (context) {
    const options = {
        width: 400,
        height: 350,
        identifier: 'offsetpath.id',
    };

    const browser = new BrowserWindow(options);

    browser.setResizable(false);

    browser.loadURL('./offset.html');

    const webContents = browser.webContents;

    webContents.on('nativeGo', (s) => {
        //value from the UI
        const obj = JSON.parse(s);

        let paths = processOffset(context);
        let newArray = new Array();
        //building array of requests
        paths.forEach(function(path){
            newArray.push(offsetPathsApi(path, obj));
        });

        //completing requests and closing the UI
        Promise.all(newArray).then((s) => {
            browser.close();
        }).catch(function(error){
            UI.alert("Error",error);
        });

    });

    webContents.on('nativeClose', (s) => {
        browser.close();
    });

}
/**
 * Looping through selected items and getting paths from the first two nested layers
 * 
 * @param {*} context - selection
 * 
 * @return {array} arrayPaths - array of JSON objects with path data and objects themselves
 */
function processOffset(context) {
    // query selected layers for svg path data
    let loopSelection = context.selection;
    let arrayPaths = new Array();
    
    //error if nothing is selected
    if (loopSelection.length == 0) {
            UI.alert("Error", "No paths are selected");
    } 
    loopSelection.forEach(layer => {
  
            //check class's name if group 
            //drill down to further selection where there is a path and add that to the array
            if ((layer.class() == MSLayerGroup) || (layer.class() == MSShapeGroup)) {
                let i;
                for (i = 0; i < layer.layers().length; i++) {
            
                    if (layer.layers()[i].class() == MSShapePathLayer) {
                        let path = svgConverter(layer.layers()[i].pathInFrame());
                        arrayPaths.push({"path": path, "obj": layer.layers()[i]});
                    } else if ((layer.layers()[i].class() == MSShapeGroup) || (layer.class() == MSLayerGroup)) {
              
                        layer.layers()[i].layers().forEach(element => {
                        
                            if (element.class() == MSShapePathLayer) {
                                let path = svgConverter(element.pathInFrame());
                                arrayPaths.push({"path": path, "obj": element});

                            }
                        });
                    }
                }
            } else if (layer.class() == MSShapePathLayer) {
                    let path = svgConverter(layer.pathInFrame());
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
    let path = NSBezierPath.bezierPathWithPath(obj);
    let sel = NSSelectorFromString("svgPathAttribute");
    let svg = path.performSelector(sel);
    let svgPath = svg.toString().slice(3, -1);

    return svgPath;
}
/**
 * Hacking method of replacing pathdata in passed object
 * returns a promise chained into the previous method
 * 
 * @param {*} obj 
 */
function offsetClosure(obj) {
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
 * 2. we wait for the response
 * 3. we replace paths with that response
 * 
 * @param {*} path - object with path and original object
 * @param {*} options - options for the call
 * 
 * @return Promise
 */
function offsetPathsApi(path, options) {

    var url = "https://astui.tech/api/v1/offset";
    var apiToken = Settings.settingForKey("api_token");

    let closure = offsetClosure(path.obj);
    let content = "";
        if (options.limit !== '') {
          content = "api_token=" + apiToken + "&path=" + path.path + "&offset=" + options.width + "&join_type=" + options.type + "&mitre_limit=" + options.limit;
        } else {
          content = "api_token=" + apiToken + "&path=" + path.path + "&offset=" + options.width + "&join_type=" + options.type;
        }
        return fetch(url, {
            method: 'post',
            headers: {
                "Cache-Control": "no-cache",
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            },
            body: content,
        })
        .then(
            function (response) {
                
                if (response.status !== 200) {
                    throw response;
                }
               
                return response.json();
            }
        ).then(closure);
}