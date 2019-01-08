/**
 * class that gets the UI data and binds it to the pluginCall 
 */
import pluginCall from 'sketch-module-web-view/client';


let width = document.getElementById('width');
let type = document.getElementById('type');
let limit = document.getElementById('limit');

if (type.value == 'miter') {
    limit.disabled = false;
    limit.value = 20;
} 

/**
 * Resetting value of mitre limit to pass with the call
 */
type.addEventListener('change', function () {
    
    if (type.value == 'miter') {
        limit.disabled = false;
        limit.value = 20;
    } else {
        limit.disabled = true;
        limit.value = '';
    }
});

/**
 * Passing data selected by the user into the sketch environment
 * width - is selected by the user 
 * type - offset type
 * limit - if type is miter
 */
document.getElementById('apply').addEventListener('click', function () {
    // log('testing');

    var obj = {
        "width": width.value,
        "type": type.value,
        "limit": limit.value,
    };
    document.getElementById("loading").style.display = "block";
    //resolving the plugin call connection and closing the window.
    pluginCall('nativeGo', JSON.stringify(obj));
});

/**
 * When cancel is pressed, abort the progress.
 */
document.getElementById('cancel').addEventListener('click', function () {
    pluginCall('nativeClose', "placeholder");
});