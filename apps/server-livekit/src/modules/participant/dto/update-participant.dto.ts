import { IsOptional, IsString, IsBoolean, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ParticipantPermissionDto {
  @IsOptional()
  @IsBoolean()
  canSubscribe?: boolean;

  @IsOptional()
  @IsBoolean()
  canPublish?: boolean;

  @IsOptional()
  @IsBoolean()
  canPublishData?: boolean;

  @IsOptional()
  @IsBoolean()
  hidden?: boolean;

  @IsOptional()
  @IsBoolean()
  recorder?: boolean;
}

export class UpdateParticipantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  metadata?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ParticipantPermissionDto)
  permission?: ParticipantPermissionDto;
}
