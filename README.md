## Routes appended in front of 'auth/identity/'

@Controller()
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60 } })
  async register(@Body() dto: RegisterCredsDto): Promise<CredsInterface> {
    return this.identityService.register(dto);
  }

  @Post('oauth-register')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60 } })
  async oauth_register(@Body() dto: OAuthCredsDto): Promise<CredsInterface> {
    return this.identityService.oauth_register(dto);
  }
  
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60 } })
  async login(@Body() dto: LoginCredsDto): Promise<CredsInterface> {
    return this.identityService.loginUser(dto);
  }

  @Post('existence')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60 } })
  async existence(@Body() dto: ExistenceCheckDto): Promise<ExistenceCheckInterface> {
    return this.identityService.checkUserExistence(dto);
  }

  @Post('alternate')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60 } })
  async alternate(@Body() dto: AlternateIdentifierDto): Promise<AlternateIdentifierInterface> {
    return this.identityService.getAlternateIdentifier(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60 } })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    return this.identityService.resetPassword(dto);
  }

}


## DTOs

import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';
import { OAUTH_PROVIDERS, OAuthProvider } from './entities/oauth-account.entity';

export class RegisterCredsDto {

  @IsString()
  phone: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class LoginCredsDto {

  @IsIn(['email', 'phone'])
  method: 'email' | 'phone';

  @IsString()
  identifier: string;

  @IsString()
  password: string;
}

export class OAuthCredsDto {
  @IsIn(OAUTH_PROVIDERS)
  provider: OAuthProvider;

  @IsString()
  provider_user_id: string;

  @IsEmail()
  email?: string;
}



export class ExistenceCheckDto {
  @IsIn(['email', 'phone'])
  method: 'email' | 'phone';

  @IsString()
  identifier: string;
}

export class AlternateIdentifierDto {
  @IsIn(['email', 'phone'])
  method: 'email' | 'phone';

  @IsString()
  identifier: string;
}

export class ResetPasswordDto {
  @IsIn(['email', 'phone'])
  method: 'email' | 'phone';

  @IsString()
  identifier: string;

  @IsString()
  new_password: string;
}



export interface ExistenceCheckInterface {
  user_exists: boolean;
}

export interface CredsInterface {
  code: string;
}

export interface AlternateIdentifierInterface {
  alt_method: 'email' | 'phone';
  alt_identifier: string;
}
