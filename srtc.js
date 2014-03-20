define(["pc"], function(_pc) {

var comm_media = $(
	"<form><ul>" +
	"<li><input type='checkbox'>chat</li>" +
	"<li><input type='checkbox'>audio</li>" +
	"<li><input type='checkbox'>video</li>" +
	"<li><input type='submit'></li>" +
	"</ul></form>"
);

var start_button = $("<button id='start_button'>Start!</button>");
var caller_sdp = $("<input>", { type: "text", id: "caller_sdp" });
var callee_sdp = $("<input>", { type: "text", id: "callee_sdp" });

var chat_window = $("<div>", { id: "chat_window"});
var chat_form   = $("<form>", { id: "chat_form" });
var chat_input  = $("<input>", { type: "text", id: "chat_input" });
var chat_enter = $("<button id='chat_enter'>Enter</button>");
chat_form.append(chat_input, chat_enter);

var video_window = $("<video>");

/*****************************************************************************/

var pc = _pc.MakePC(_pc.Dconf, _pc.Dopts);

/*****************************************************************************/

// on start button click, start call and display sd
start_button.click(function() {
	_pc.PCStartCall(pc, function(sd) {
		caller_sdp.val(JSON.stringify(sd));
	});
});

// if user inputs caller sdp
caller_sdp.on("input", function() {
	// receive sd
	var rsd = JSON.parse(caller_sdp.val());
	_pc.PCRespondCall(pc, rsd, function(sd) {
		// display sd
		callee_sdp.val(JSON.stringify(sd));
	});
});

// if user inputs callee sdp
callee_sdp.on("input", function() {
	var rsd = JSON.parse(callee_sdp.val());
	_pc.PCEstablishCall(pc, rsd);
});

/*****************************************************************************/

function connectMedia(isChat, isAudio, isVideo, callbackFunc) {
	var content = $($("#content")[0]);
	if (isChat) {
		// add data channel to peer connection
		var dc = pc.rtcpc.createDataChannel("dc", {});
	
		chat_form.submit(function() {
			var text = chat_input.val();
			chat_window.append($("<p>").html(text));
			dc.send(text);
			return false;
		});

		dc.onmessage = function(e) {
			chat_window.append($("<p>").html(e.data));
		};

		dc.onopen = function() {
			content.append(chat_window);
			content.append(chat_form);
		};
	}

	if (isAudio || isVideo) {
		pc.rtcpc.onaddstream = function(e) {
			content.append(video_window);
			var url = (window.URL || window.webkitURL);
			$("video")[0].src = url.createObjectURL(e.stream);
			$("video")[0].play();
		};

		// add audio and video to peer connection
		navigator.getMedia = (
			navigator.getUserMedia ||
			navigator.webkitGetUserMedia ||
			navigator.mozGetUserMedia ||
			navigator.msGetUserMedia
		);
		navigator.getMedia(
			{audio: isAudio, video: isVideo},
			function(stream) {
				pc.rtcpc.addStream(stream);

				console.log(stream.getVideoTracks());
				console.log(stream);


				callbackFunc();
			},
			function(e) {
				console.log(e);
			}
		);
	} else {
		callbackFunc();
	}
}

// main
$(document).ready(function() {
	var content = $($("#content")[0]);
	content.append(comm_media);

	var isChat = false;
	var isAudio = false;
	var isVideo = false;

	comm_media.submit(function() {
		isChat = comm_media.find("input")[0].checked;
		isAudio = comm_media.find("input")[1].checked;
		isVideo = comm_media.find("input")[2].checked;
		if (!isChat && !isAudio && !isVideo) {
			alert("You must select at least one of chat, audio, or video.");
			return false;
		}

		connectMedia(isChat, isAudio, isVideo, function() {
			content.append(start_button);
			content.append(caller_sdp);
			content.append(callee_sdp);
		});
		return false;
	});
});

return {}});
