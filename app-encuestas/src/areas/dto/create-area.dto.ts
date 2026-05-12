import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateAreaDto {
  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsString()
  @MaxLength(100)
  slug: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
