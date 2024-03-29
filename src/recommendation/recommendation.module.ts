import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Place } from 'src/place/entities/place.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { Travel } from 'src/travel/entities/travel.entity';
import { Schedule } from 'src/schedule/entities/schedule.entity';
import { Day } from 'src/day/entities/day.entity';
import { RecommendationService } from './recommendation.service';
import { RecommendationController } from './recommendation.controller';
import { LikeModule } from 'src/like/articlelike.module';
import { PlaceModule } from 'src/place/place.module';
import { Repository } from 'typeorm';
import { Like } from 'src/like/entities/articlelike.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Place, Travel, Schedule, Day, Like])],
  providers: [RecommendationService],
  controllers: [RecommendationController],
  exports: [RecommendationService],
})
export class RecommendateionModule {}
