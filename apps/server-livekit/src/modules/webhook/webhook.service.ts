import { Injectable, Logger } from '@nestjs/common';
import { WebhookEvent } from 'livekit-server-sdk';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  async handleWebhookEvent(event: WebhookEvent): Promise<void> {
    this.logger.log(`Received webhook event: ${event.event}`);

    try {
      switch (event.event) {
        case 'room_started':
          await this.handleRoomStarted(event);
          break;
        case 'room_finished':
          await this.handleRoomFinished(event);
          break;
        case 'participant_joined':
          await this.handleParticipantJoined(event);
          break;
        case 'participant_left':
          await this.handleParticipantLeft(event);
          break;
        case 'participant_connection_aborted':
          await this.handleParticipantConnectionAborted(event);
          break;
        case 'track_published':
          await this.handleTrackPublished(event);
          break;
        case 'track_unpublished':
          await this.handleTrackUnpublished(event);
          break;
        case 'egress_started':
          await this.handleEgressStarted(event);
          break;
        case 'egress_updated':
          await this.handleEgressUpdated(event);
          break;
        case 'egress_ended':
          await this.handleEgressEnded(event);
          break;
        case 'ingress_started':
          await this.handleIngressStarted(event);
          break;
        case 'ingress_ended':
          await this.handleIngressEnded(event);
          break;
        default:
          this.logger.warn(`Unhandled webhook event: ${event.event}`);
      }
    } catch (error) {
      this.logger.error(`Error handling webhook event ${event.event}:`, error);
      throw error;
    }
  }

  private async handleRoomStarted(event: WebhookEvent): Promise<void> {
    this.logger.log(`Room started: ${event.room?.name}`);
    // TODO: Save room session to database
    // Example: await this.roomRepository.create({ name: event.room.name, startedAt: new Date() });
  }

  private async handleRoomFinished(event: WebhookEvent): Promise<void> {
    this.logger.log(`Room finished: ${event.room?.name}`);
    // TODO: Update room session in database
    // Example: await this.roomRepository.update({ name: event.room.name }, { finishedAt: new Date() });
  }

  private async handleParticipantJoined(event: WebhookEvent): Promise<void> {
    const participant = event.participant;
    const room = event.room;
    this.logger.log(
      `Participant joined: ${participant?.identity} in room ${room?.name}`,
    );
    // TODO: Save attendance record to database
    // Example:
    // await this.attendanceRepository.create({
    //   roomName: room.name,
    //   participantIdentity: participant.identity,
    //   participantName: participant.name,
    //   joinedAt: new Date(),
    // });
  }

  private async handleParticipantLeft(event: WebhookEvent): Promise<void> {
    const participant = event.participant;
    const room = event.room;
    this.logger.log(
      `Participant left: ${participant?.identity} from room ${room?.name}`,
    );
    // TODO: Update attendance record in database
    // Example:
    // await this.attendanceRepository.update(
    //   { roomName: room.name, participantIdentity: participant.identity, leftAt: null },
    //   { leftAt: new Date() }
    // );
  }

  private async handleParticipantConnectionAborted(
    event: WebhookEvent,
  ): Promise<void> {
    const participant = event.participant;
    const room = event.room;
    this.logger.warn(
      `Participant connection aborted: ${participant?.identity} in room ${room?.name}`,
    );
    // TODO: Log error or update attendance with connection issue
  }

  private async handleTrackPublished(event: WebhookEvent): Promise<void> {
    const participant = event.participant;
    const track = event.track;
    this.logger.log(
      `Track published: ${track?.sid} by ${participant?.identity} (${track?.source})`,
    );
    // TODO: Track engagement (camera/mic usage)
  }

  private async handleTrackUnpublished(event: WebhookEvent): Promise<void> {
    const participant = event.participant;
    const track = event.track;
    this.logger.log(
      `Track unpublished: ${track?.sid} by ${participant?.identity}`,
    );
    // TODO: Update engagement tracking
  }

  private async handleEgressStarted(event: WebhookEvent): Promise<void> {
    const egressInfo = event.egressInfo;
    this.logger.log(`Egress started: ${egressInfo?.egressId}`);
    // TODO: Update recording status in database
  }

  private async handleEgressUpdated(event: WebhookEvent): Promise<void> {
    const egressInfo = event.egressInfo;
    this.logger.log(
      `Egress updated: ${egressInfo?.egressId} - Status: ${egressInfo?.status}`,
    );
    // TODO: Update recording progress in database
  }

  private async handleEgressEnded(event: WebhookEvent): Promise<void> {
    const egressInfo = event.egressInfo;
    this.logger.log(
      `Egress ended: ${egressInfo?.egressId} - Status: ${egressInfo?.status}`,
    );
    // TODO: Update recording with final status and file URL
    // Example:
    // if (egressInfo.status === EgressStatus.EGRESS_COMPLETE) {
    //   await this.recordingRepository.update(
    //     { egressId: egressInfo.egressId },
    //     {
    //       status: 'completed',
    //       fileUrl: egressInfo.file?.url,
    //       completedAt: new Date(),
    //     }
    //   );
    // }
  }

  private async handleIngressStarted(event: WebhookEvent): Promise<void> {
    const ingressInfo = event.ingressInfo;
    this.logger.log(`Ingress started: ${ingressInfo?.ingressId}`);
    // TODO: Handle ingress events if needed
  }

  private async handleIngressEnded(event: WebhookEvent): Promise<void> {
    const ingressInfo = event.ingressInfo;
    this.logger.log(`Ingress ended: ${ingressInfo?.ingressId}`);
    // TODO: Handle ingress events if needed
  }
}
