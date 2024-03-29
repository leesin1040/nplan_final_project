import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { configModuleValidationSchema } from './configs/env-validation.config';
import {
  typeOrmModuleAsyncOptions,
  typeOrmModuleAsyncOptionsUpdatePlace,
} from './configs/database.config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { TravelModule } from './travel/travel.module';
import { LikeModule } from './like/articlelike.module';
import { CommentModule } from './comment/comment.module';
import { MemberModule } from './member/member.module';
import { ScheduleModule } from './schedule/schedule.module';
import { DayModule } from './day/day.module';
import { PlaceModule } from './place/place.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailModule } from './email/email.module';
import { UpdatePlaceModule } from './updateplace/update.place.module';
import { ArticleModule } from './article/article.module';
import { RecommendateionModule } from './recommendation/recommendation.module';
import { SearchModule } from './elasticsearch/elasticsearch.module';
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/exception.filter';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configModuleValidationSchema,
    }),
    TypeOrmModule.forRootAsync(typeOrmModuleAsyncOptions),
    TypeOrmModule.forRootAsync(typeOrmModuleAsyncOptionsUpdatePlace),
    AuthModule,
    UserModule,
    TravelModule,
    CommentModule,
    MemberModule,
    ScheduleModule,
    DayModule,
    PlaceModule,
    EmailModule,
    ArticleModule,
    RecommendateionModule,
    UpdatePlaceModule,
    ArticleModule,
    LikeModule,
    MailerModule.forRootAsync({
      useFactory: () => ({
        transport: `smtps://${process.env.EMAIL_AUTH_EMAIL}:${process.env.EMAIL_AUTH_PASSWORD}@${process.env.EMAIL_HOST}`,
        defaults: {
          from: `"${process.env.YOUR_EMAIL}" <${process.env.EMAIL_AUTH_EMAIL}>`,
        },
      }),
    }),
    SearchModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_FILTER, useClass: HttpExceptionFilter }],
})
export class AppModule {}
