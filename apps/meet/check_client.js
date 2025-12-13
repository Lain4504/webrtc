const client = require('livekit-client');
console.log('supportsScreenSharing:', !!client.supportsScreenSharing);
console.log('isBrowserSupported:', !!client.isBrowserSupported);
console.log('Track:', !!client.Track);
console.log('Room:', !!client.Room);
