const componentsReact = require('@livekit/components-react');
console.log('supportsScreenSharing:', !!componentsReact.supportsScreenSharing);
console.log('isEqualTrackRef:', !!componentsReact.isEqualTrackRef);
console.log('isTrackReference:', !!componentsReact.isTrackReference);
console.log('isWeb:', !!componentsReact.isWeb);
console.log('log:', !!componentsReact.log);
console.log('TrackReferenceOrPlaceholder:', 'TrackReferenceOrPlaceholder' in componentsReact);
console.log('WidgetState:', 'WidgetState' in componentsReact);
