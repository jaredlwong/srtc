//define([], function() { return function() {
define(function() {

var rtcPeerConnection = (
	window.RTCPeerConnection ||
	window.webkitRTCPeerConnection ||
	window.mozRTCPeerConnection
);

var rtcSessionDescription = (
	window.RTCSessionDescription ||
	window.webkitRTCSessionDescription ||
	window.mozRTCSessionDescription
);

var rtcIceCandidate = (
	window.RTCIceCandidate ||
	window.webkitRTCIceCandidate ||
	window.mozRTCIceCandidate
);

// default rtcPeerConnection config
var Dconf = {
	iceServers: [{
		url: 'stun:stun.l.google.com:19302'
	}]
};

// default rtcPeerConnection options
var Dopts = {
	optional: [{
		RtpDataChannels: true
	}]
};

var PC = function() {
	this.rtcpc = null; // the underlying rtcPeerConnection
	this.cs = null; // candidates
	this.idf = null; // ice done channel
};

function MakePC(conf, opts) {
	var pc = new PC();
	pc.rtcpc = new rtcPeerConnection(conf, opts);
	pc.cs = [];
	pc.idf = function() {};
	pc.rtcpc.onicecandidate = function(e) {
		console.log(JSON.stringify(e));
		if (e && e.candidate) {
			pc.cs.push(e.candidate);
		} else {
			pc.idf();
		}
	};
	return pc;
}

// standalone description
var SD = function() {
	this.sdp = null;
	this.cs = null;
};

function MakeSD(sdp, cs) {
	var sd = new SD();
	sd.sdp = sdp;
	sd.cs = cs;
	return sd;
}

// REMEMBER: must set up data channels/media streams before starting call,
// otherwise ice will get confused
// pc: PC, returnFunc: func(SD)
function PCStartCall(pc, returnFunc) {
	// runs after setLocalDescription + ice negotiation occurs
	pc.idf = function() {
		var sd = MakeSD(pc.rtcpc.localDescription, pc.cs);
		returnFunc(sd);
	};

	pc.rtcpc.createOffer(function(sdp) {
		pc.rtcpc.setLocalDescription(sdp, function(){}, function(){});
		// ice negotiations happen after setLocalDescription
	}, function() {},
	{ optional: [], mandatory: { OfferToReceiveAudio: true, OfferToReceiveVideo: true }});
}

// REMEMBER: must set up data channels/media streams before starting call,
// otherwise ice will get confused
// pc: PC, sd: SD, returnFunc: func(SD)
function PCRespondCall(pc, rsd, returnFunc) {
	// runs after setLocalDescription + ice negotiation occurs
	pc.idf = function() {
		var sd = MakeSD(pc.rtcpc.localDescription, pc.cs);
		returnFunc(sd);
	};

	// set caller's sdp
	// NOTE must be set before setting caller's candidates
	pc.rtcpc.setRemoteDescription(new rtcSessionDescription(rsd.sdp), function(){}, function(){});

	// add caller's candidates
	for (var i = 0; i < rsd.cs.length; ++i) {
		pc.rtcpc.addIceCandidate(new rtcIceCandidate(rsd.cs[i]), function(){}, function(){});
	}

	// generate our own sdp
	pc.rtcpc.createAnswer(function(sdp) {
		pc.rtcpc.setLocalDescription(sdp, function(){}, function(){});
		// ice negotiations happen after setLocalDescription
	}, function() {});
}

// pc: PC, sd: SD
function PCEstablishCall(pc, rsd) {
	// set callee's sdp
	// NOTE must be set before setting caller's candidates
	pc.rtcpc.setRemoteDescription(new rtcSessionDescription(rsd.sdp), function(){}, function(){});

	// add callee's candidates
	for (var i = 0; i < rsd.cs.length; ++i) {
		pc.rtcpc.addIceCandidate(new rtcIceCandidate(rsd.cs[i]), function(){}, function(){});
	}
}

return {
	Dconf: Dconf,
	Dopts: Dopts,
	MakePC: MakePC,
	PCStartCall: PCStartCall,
	PCRespondCall: PCRespondCall,
	PCEstablishCall: PCEstablishCall,
};

});
