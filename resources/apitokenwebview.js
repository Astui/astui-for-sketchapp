import pluginCall from 'sketch-module-web-view/client'

// Disable the context menu to have a more native feel
document.addEventListener("contextmenu", function (e) {
	e.preventDefault();
});

//this binds into the apitoken.js command via pluginCall and nativeGo event
//we get the value of the token from the input
document.getElementById('api_token').addEventListener('change', function () {
	var token = document.getElementById("api_token").value;
	pluginCall("nativeGo", token);
});
//creating new methods on the window object, so we can call in in the main command file
window.setAPIToken = function (token) {
	document.getElementById("api_token").value = token;
};
