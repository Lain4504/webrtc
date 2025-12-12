import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class MuteTrackDto {
  @IsString()
  @IsNotEmpty()
  trackSid: string;

  @IsBoolean()
  @IsNotEmpty()
  muted: boolean;
}
