import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { WebhookReceiver } from 'livekit-server-sdk';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from './webhook.service';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly receiver: WebhookReceiver;

  constructor(
    private readonly configService: ConfigService,
    private readonly webhookService: WebhookService,
  ) {
    const apiKey = this.configService.getOrThrow<string>('LIVEKIT_API_KEY');
    const apiSecret =
      this.configService.getOrThrow<string>('LIVEKIT_API_SECRET');
    this.receiver = new WebhookReceiver(apiKey, apiSecret);
  }

  @Post('livekit')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('authorization') auth: string,
  ): Promise<{ received: boolean }> {
    try {
      // Get raw body from request (set by express.raw middleware)
      const rawBody = (req as any).rawBody || req.body;

      // WebhookReceiver needs the raw string for signature verification
      const bodyString =
        rawBody instanceof Buffer
          ? rawBody.toString('utf-8')
          : typeof rawBody === 'string'
            ? rawBody
            : JSON.stringify(rawBody);

      // Validate and decode webhook event
      const event = await this.receiver.receive(bodyString, auth);

      // Handle the event asynchronously
      await this.webhookService.handleWebhookEvent(event);

      return { received: true };
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      throw error;
    }
  }
}
