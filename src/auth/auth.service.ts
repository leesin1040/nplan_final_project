import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { RegisterDto } from './dtos/register.dto';
import bcrypt from 'bcrypt';
import { LoginDto } from './dtos/login.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly mailerService: MailerService,
  ) {}

  /* 회원가입 */
  async register({ name, email, password, passwordConfirm }: RegisterDto) {
    const passwordMatch = password === passwordConfirm;
    if (!passwordMatch) {
      throw new BadRequestException('비밀번호가 일치하지 않습니다.');
    }
    const existedUser = await this.userRepository.findOneBy({ email });
    if (existedUser) {
      throw new BadRequestException('이미 사용중인 이메일입니다.');
    }

    const hashRounds = this.configService.get<number>('PASSWORD_HASH_ROUNDS');
    const hashedPassword = bcrypt.hashSync(password, hashRounds);
    const user = await this.userRepository.save({
      name,
      email,
      password: hashedPassword,
    });

    return this.login(user.id);
  }

  /* 로그인 */
  // async login(userId: number) {
  //   const payload = { id: userId };
  //   const accessToken = this.jwtService.sign(payload);

  //   const user = await this.userRepository.findOne({ where: { id: userId } });

  //   user.refreshToken = this.jwtService.sign(payload);
  //   await this.userRepository.save(user);

  //   return { accessToken: accessToken };
  // }

  /* 로그인 핫픽스 */
  async login(userId: number) {
    console.log('로그인 입장 4');
    const payload = { id: userId };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '7h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.redisService.setRefreshToken(userId, refreshToken);

    return { accessToken };
  }

  /* 유저 확인 */
  async validateUser({ email, password }: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email },
      select: { id: true, password: true },
    });
    const passwordMatch = bcrypt.compareSync(password, user?.password ?? '');
    if (!user || !passwordMatch) return null;
    return { id: user.id };
  }

  // jwt.strategy.ts 파일에 유저 정보 넘겨주기 위한 함수
  async findByUserId(id: number): Promise<User> {
    return await this.userRepository.findOne({ where: { id } });
  }

  // 토큰 갱신
  async refresh(userId: number) {
    const refreshToken = await this.redisService.getRefreshToken(userId);

    if (!refreshToken) {
      throw new BadRequestException('유효하지 않은 토큰입니다. 다시 로그인을 진행해주세요.');
    }
    const payload = { id: userId };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken };
  }
}
