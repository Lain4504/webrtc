import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  participantName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  participantIdentity: string;

  @IsString()
  @IsIn(['instructor', 'student'])
  role: 'instructor' | 'student';

  @IsString()
  @IsOptional()
  metadata?: string; // Optional metadata to merge with role metadata
}
