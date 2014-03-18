requirejs.config({
"paths": {
	"jquery": "http://ajax.googleapis.com/ajax/libs/jquery/2.0.0/jquery.min"
}
});

requirejs(["jquery"], function($) {
$(document).ready(function() {

var content = $($("#content")[0]);


function PeerConnection() {
	var pc = new webkitRTCPeerConnection({
		iceServers: [{
			url: 'stun:stun.l.google.com:19302'
		}]
	}, {
		optional: [{
			RtpDataChannels: true
		}]
	});


	pc.onsignalingstatechange = function() {
		console.log("signalingstatechange: " + chatpc.signalingState);
	};

	pc.oniceconnectionstatechange = function() {
		console.log("iceconnectionstatechange: " + chatpc.iceConnectionState);
	};

	pc.candidates = [];
	pc.onicecandidate = function(e) {
		if (e && e.candidate) {
			pc.candidates.push(e.candidate);
		} else {
			$(pc).trigger("candidates");
		}
	};

	pc.initiateCall = function() {
		pc.createOffer(function(sdp) {
			pc.setLocalDescription(sdp);
		});
		return pc.localDescription;
	};

	pc.receiveCall = function(callerSdp) {
		pc.setRemoteDescription(new RTCSessionDescription(callerSdp));
		pc.createAnswer(function(sdp) {
			pc.setLocalDescription(sdp);
		});
		return pc.localDescription;
	};

	return pc;
}

var chatpc, chatchan;
var chat_start_button = $("<button id='chat_start_button'>Start a chat!</button>");
var chat_caller = $("<input>", { type: "text", id: "chat_caller" });
var chat_callee = $("<input>", { type: "text", id: "chat_callee" });
var chat_window = $("<div>", { id: "chat_window"});
var chat_form   = $("<form>", { id: "chat_form" });
var chat_input  = $("<input>", { type: "text", id: "chat_input" });
var chat_enter_button = $("<button id='chat_enter_button'>Enter</button>");
chat_form.append(chat_input, chat_enter_button);

function createChatChannel() {
	chatchan = chatpc.createDataChannel("chat_channel", {});

	chat_form.submit(function() {
		var text = chat_input.val();
		chat_window.append($("<p>").html(text));
		chatchan.send(text);
		return false;
	});
	
	chatchan.onmessage = function(e) {
		chat_window.append($("<p>").html(e.data));
		console.log(e.data);
	};
	
	chatchan.onopen = function() {
		content.append(chat_window);
		content.append(chat_form);
	};
}

// caller: step 1
// when chat_start_button is clicked, create caller's sdp
chat_start_button.click(function() {
	console.log("step 1");
	chatpc = PeerConnection(null);

	// must set up data channel before starting call, otherwise ice will
	// get confused
	createChatChannel();
	chatpc.initiateCall();

	$(chatpc).on("candidates", function() {
		console.log("setting caller val");
		var sdpAndCandidates = {
			sdp: chatpc.localDescription,
			candidates: chatpc.candidates
		};
		chat_caller.val(JSON.stringify(sdpAndCandidates));
	});
});

// callee: step 2
// when user inputs caller's sdp, create callee's sdp
chat_caller.on("input", function() {
	console.log("step 2");
	var callerSdpAndCandidates = JSON.parse(chat_caller.val());
	var callerSdp = callerSdpAndCandidates.sdp;
	var callerCandidates = callerSdpAndCandidates.candidates;

	chatpc = PeerConnection(null);
	// must set up data channel before starting call, otherwise ice will
	// get confused
	createChatChannel();
	chatpc.receiveCall(callerSdp);

	$(chatpc).on("candidates", function() {
		console.log("setting caller val");
		var sdpAndCandidates = {
			sdp: chatpc.localDescription,
			candidates: chatpc.candidates
		};
		chat_callee.val(JSON.stringify(sdpAndCandidates));
	});

	for (var i = 0; i < callerCandidates.length; ++i) {
		chatpc.addIceCandidate(new RTCIceCandidate(callerCandidates[i]));
	}
});

// caller: step 3
// when user inputs callee's sdp, set caller's remote sdp
chat_callee.on("input", function() {
	console.log("step 3");
	var calleeSdpAndCandidates = JSON.parse(chat_callee.val());
	var calleeSdp = calleeSdpAndCandidates.sdp;
	var calleeCandidates = calleeSdpAndCandidates.candidates;

	chatpc.setRemoteDescription(new RTCSessionDescription(calleeSdp));

	for (var i = 0; i < calleeCandidates.length; ++i) {
		chatpc.addIceCandidate(new RTCIceCandidate(calleeCandidates[i]));
	}
});

content.append(chat_start_button);
content.append(chat_caller);
content.append(chat_callee);

}); // jquery
}); // requirejs
