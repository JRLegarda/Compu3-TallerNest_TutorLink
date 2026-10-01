import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { InjectRepository } from "@nestjs/typeorm";
import { ExtractJwt, Strategy } from "passport-jwt";
import { User } from "../entities/user.entity.js";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { JwtPayload } from "../interfaces/jwt.interface.js";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy){

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private configService: ConfigService
    ){
      super({
        secretOrKey: configService.get("JWT_SECRET") as string,
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
      })  
    }

    async validate(payload: JwtPayload): Promise<User> {
    const user = await this.userRepository.findOneBy({ id: payload.id });

    if (!user) throw new UnauthorizedException('Token not valid');
    if (!user.isActive) throw new UnauthorizedException('User is not active');

    return user;
  }

}