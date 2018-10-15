/**
 * This class defines the logic of Sketch in handling paths related to the API request
 * This code's purpose is to show that it is possible for Sketchapp to work with Astui
 * */

 /**
  * Require Sketch's elements
  */
var UI = require('sketch/ui');
var Settings = require('sketch/settings');
/**
 * Creating the browser window width defined parameters
 */
import BrowserWindow from 'sketch-module-web-view';

export default function (context) {
    const options = {
        identifier: 'apitoken.id',
        width: 600,
        height: 250
    };

    const browserWindow = new BrowserWindow(options);

    const webContents = browserWindow.webContents;

    //we don't want the window to be resized
    browserWindow.setResizable(false);
    
    /**
     * This populates the api_token input with the current API token. 
     */
    webContents.on('did-finish-load', () => {
        var token = Settings.settingForKey("api_token");
        if (token) {
            webContents.executeJavaScript(`setAPIToken(\' ${token} \')`);
        }
    });
    /**
     * When the window is being executed we bind into sketchapp's pluginCall
     * Via this call we get the token that has been inserted on the HTML view.
     * The string gets passed from webview file into here.
     */
    webContents.on('nativeGo', (token) => {
        checkAuth(token, browserWindow);
    });

    //loading the local HTML for this 
    browserWindow.loadURL('./apitoken.html');
}

/**
 * Checking authentication, just sending a post fetch request and depending on the response
 * handle it appropriately 
 * 
 * @param string token 
 * @param {*} browserWindow - only exists in the scope of default method, gotta pass it through to process
 */
function checkAuth(token, browserWindow) {

    fetch("https://astui.tech/api/v1/validate", {
        method: "post",
        headers: {
            "Cache-Control": "no-cache",
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
        },
        body: "api_token=" + token,
    }).then(
        function (response) {
            if (response.status == 200) {
        
                Settings.setSettingForKey('api_token', token);
                browserWindow.close();
            }  else {
                UI.alert('Failed', response.status + ": " + response.message);
            } 
  
          return response.json();
        }).catch(function(error){
            UI.alert("Error", error);
        });
}
