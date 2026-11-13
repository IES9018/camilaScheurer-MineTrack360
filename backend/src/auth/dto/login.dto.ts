import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Cuerpo esperado por POST /api/v1/auth/login. */
export class LoginDto {
  @ApiProperty({ example: 'admin@minetrack360.com' })
  // El email se normaliza (sin espacios, en minúsculas) antes de validarlo
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'ContraseñaSegura123' })
  @IsString()
  @IsNotEmpty()
  // bcrypt solo considera los primeros 72 bytes de la contraseña
  @MaxLength(72)
  password: string;
}
