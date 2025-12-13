import {
  IsOptional,
  IsString,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class S3ConfigDto {
  @IsString()
  accessKey: string;

  @IsString()
  secret: string;

  @IsString()
  bucket: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  endpoint?: string;

  @IsOptional()
  forcePathStyle?: boolean;
}

export class StartRecordingDto {
  @IsOptional()
  @IsString()
  layout?: string;

  @IsOptional()
  @IsString()
  filepath?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => S3ConfigDto)
  s3Config?: S3ConfigDto;
}
