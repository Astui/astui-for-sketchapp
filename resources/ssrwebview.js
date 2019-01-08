/**
 * class that gets the UI data and binds it to the pluginCall 
 */
import pluginCall from 'sketch-module-web-view/client'

/**
 * This section focuses on mirroring the accuracy value that the user has selection
 */
document.getElementById('tolerance_value').innerHTML = 30;

document.getElementById('accuracy').addEventListener('input', function () {
	var tolerance = document.getElementById('accuracy').value;
	document.getElementById('tolerance_value').innerHTML = tolerance;
});

/**
 * Passing data selected by the user into the sketch environment
 * accuracy - is selected by the user 
 * decimal - doesn't exist in this context for sketch, so set to default three.
 */
document.getElementById('apply').addEventListener('click', function () {


	
	var tolerance = document.getElementById('accuracy').value;
	var decimal = 3;
	var obj = {
		"tolerance": tolerance,
		"decimal": decimal
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

// Disable the context menu to have a more native feel
document.addEventListener("contextmenu", function (e) {
	e.preventDefault();
});