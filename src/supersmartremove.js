/**
 * This class defines the logic of Sketch in handling paths related to the API request
 * This code's purpose is to show that it is possible for Sketchapp to work with Astui
 *  */

//getting sketch dependencies and polyphills 
var UI = require('sketch/ui');
var fetch = require('sketch-polyfill-fetch');
var Settings = require('sketch/settings');
var counter = 0; //counter for iterations
// file scoped variable for stopping double error messaging. Setting the code to a successful request 
var global_error = 200;

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
    identifier: 'supersmartremove.id',
    width: 400,
    height: 350
  };
  //instantiating the window and getting the webContents object to work with
  const browserWindow = new BrowserWindow(options);

  browserWindow.setResizable(false);

  const webContents = browserWindow.webContents;

  /**
   *  binding with the webview to get the data from selection
   *  Working with the path data with processSelected method and closing the browser window
  /*/
  webContents.on('nativeGo', (s) => {
    var obj = JSON.parse(s);
    processSelected(context, obj, webContents);
    browserWindow.close();
  });

  /**
   * This binds the cancel button event listener to the sketch plugin process.
   */
  webContents.on('nativeClose', (s) => {
    browserWindow.close();
  });

  browserWindow.loadURL('./supersmartremove.html');
}

/**
 * Method that replaces the original paths with the new received from the API
 * Instead of just replacing pathdata of each selection, 
 * we define with cocoa script what type of curve each path is and parse it
 * Upon completion we can get alerted that all paths are replaced using setPathInFrame
 * 
 * @param {*} obj 
 */
function smartRemovalClosure(obj) {
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
 * 2. we wait for the response
 * 3. we replace paths with that response
 * @param {*} obj 
 */
function doSmartPointRemoval(obj, options, webContents) {
  var url = "https://astui.tech/api/v1/ssr";
  var api_token = Settings.settingForKey("api_token");
  var path = NSBezierPath.bezierPathWithPath(obj.pathInFrame());
  var closefunc = smartRemovalClosure(obj, webContents);

  var sel = NSSelectorFromString("svgPathAttribute");
  var svg = path.performSelector(sel);

  // slice off d= and quotes 
  var svgpath = svg.toString().slice(3, -1);


  var postbody = "path=" + svgpath + "&api_token=" + api_token + "&tolerance=" + options.tolerance + "&decimal=" + options.decimal;
  fetch(url, {
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
    .then(closefunc)
    .catch(function (error) {
      //Handling the thrown error. Since we got the whole response, we can set appropriate error message straight out of the response
      if (global_error == 200) {
        UI.alert("Error", error.status + ": " + error.statusText);
        global_error = error.status; //sets the var letting us only see one alert. 

      }
    });
}


/**
 * Breaking the selected object on the screen into shapes and paths and 
 * foreach of the paths process them through Astui
 * 
 * @param {*} context 
 * @param {*} options 
 * @param {*} webContents 
 */
function processSelected(context, options, webContents) {

  counter = 0;
  global_error = 200;

  /* query selected layers for svg path data */
  var loopSelection = context.selection.objectEnumerator(),
    obj;
  while (obj = loopSelection.nextObject()) {
    if (obj.class() == MSShapeGroup) {
      var i;

      for (i = 0; i < obj.layers().length; i++) {
        if (obj.layers()[i].class() == MSShapePathLayer) {
          doSmartPointRemoval(obj.layers()[i], options, webContents);
        }
      }

    }
    if (obj.class() == MSShapePathLayer) {
      doSmartPointRemoval(obj, options, webContents);
    }
  }

}