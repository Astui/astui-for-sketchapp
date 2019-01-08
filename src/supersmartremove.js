/**
 * This class defines the logic of Sketch in handling paths related to the API request
 * This code's purpose is to show that it is possible for Sketchapp to work with Astui
 *  */

//getting sketch dependencies and polyphills 
var UI = require('sketch/ui');
var fetch = require('sketch-polyfill-fetch');
var Settings = require('sketch/settings');

//allows to create a browser window rather than rely just on the UI
import BrowserWindow from 'sketch-module-web-view';


/**
 * This is calling BrowserWindow's default method
 * Defining parameters of the invoked window: size, default event and content
 * 
 * @param {*} context 
 */
export default function (context) {
  const options = {
    identifier: 'smartremove.id',
    width: 400,
    height: 450
  };
  //instantiating the window and getting the webContents object to work with
  const browserWindow = new BrowserWindow(options);

  browserWindow.setResizable(false);

  browserWindow.loadURL('./supersmartremove.html');

  const webContents = browserWindow.webContents;

  /**
   *  binding with the webview to get the data from selection
   *  Working with the path data with processSelected method and closing the browser window
  /*/
  webContents.on('nativeGo', (s) => {
    const obj = JSON.parse(s);
    // you can continue working synchronously here
    let paths = processSelected(context);

    let newArray = new Array();

    paths.forEach(function(path){
        newArray.push(doSmartPointRemoval(path, obj));
    });
    Promise.all(newArray).then((s) => {
      browserWindow.close();
    }).catch(function(error){
        UI.alert("Error",error);
    });

  });

  /**
   * This binds the cancel button event listener to the sketch plugin process.
   */
  webContents.on('nativeClose', (s) => {
    browserWindow.close();
  });

}

/**
 * Hacking method of replacing pathdata in passed object
 * returns a promise chained into the previous method
 * 
 * @param {*} obj 
 */
function smartRemovalClosure(obj) {
  // log("Getting to closures");
    return function (data) {
      var isPathClosedPtr = MOPointer.alloc().init();
      var svgProcessedPath = SVGPathInterpreter.bezierPathFromCommands_isPathClosed(data.path, isPathClosedPtr);

      var newPath = MSPath.pathWithBezierPath(svgProcessedPath);
      obj.setPathInFrame_(newPath);       
    }
}


/**
 * Breaking the selected object on the screen into shapes and paths and 
 * foreach of the paths process them through Astui
 * 
 * @param {*} context 
 * @param {*} options 
 * @param {*} webContents 
 */
function processSelected(context) {
  let loopSelection = context.selection;
  let arrayPaths = new Array();
  
  if (loopSelection.length == 0) {
          UI.alert("Error", "No paths are selected");
  }
  //check class's name if group 
  //drill down to further selection where there is a path and add that to the array
  loopSelection.forEach(layer => {
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

function svgConverter(obj)
{

    var path = NSBezierPath.bezierPathWithPath(obj);

    var sel = NSSelectorFromString("svgPathAttribute");
    var svg = path.performSelector(sel);
    var svgPath = svg.toString().slice(3, -1);

    return svgPath;
}


/**
 * Calling the API 
 * We get the path information by getting all vector data from pathInFrame method
 * 1.We send the data
 * 2. we wait for the response
 * 3. we replace paths with that response
 * @param {*} pathObject object with path data and the object for the closure
 * @param {*} options 
 * 
 * @return Promise 
 */
function doSmartPointRemoval(pathObject, options) {
  const url = "https://astui.tech/api/v1/spr";
  let api_token = Settings.settingForKey("api_token");
  const closefunc = smartRemovalClosure(pathObject.obj);

  let postbody = "path=" + pathObject.path + "&api_token=" + api_token + "&tolerance=" + options.tolerance + "&decimal=" + options.decimal;
  return fetch(url, {
      method: 'post',
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: postbody
    })
    .then(
      //We get the response's data and start our handling of the status, we only want the response if there are errors
      //this will help the user figure out what's happened, and the path data when the response is successful
        function (response) {

          if (response.status !== 200) {
        
            throw response;
          } else {
            return response.json();
          }
        }
    )
    .then(closefunc);
}

