import { TrackReferenceOrPlaceholder, isTrackReference } from '@livekit/components-react';

export function supportsScreenSharing(): boolean {
    return (
        typeof navigator !== 'undefined' &&
        navigator.mediaDevices &&
        !!navigator.mediaDevices.getDisplayMedia
    );
}

export function isWeb(): boolean {
    return typeof document !== 'undefined';
}

export function isEqualTrackRef(
    a?: TrackReferenceOrPlaceholder,
    b?: TrackReferenceOrPlaceholder,
): boolean {
    if (a === undefined || b === undefined) {
        return false;
    }
    if (isTrackReference(a) && isTrackReference(b)) {
        return a.publication.trackSid === b.publication.trackSid;
    }
    if (!isTrackReference(a) && !isTrackReference(b)) {
        return a.source === b.source && a.participant.identity === b.participant.identity;
    }
    return false;
}
