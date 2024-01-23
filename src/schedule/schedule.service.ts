import { Injectable } from '@nestjs/common';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from './entities/schedule.entity';
import { LexoRank } from 'lexorank';
import { MoveScheduleDto } from './dto/move-schedule.dto';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
  ) {}
  // 스케줄 생성
  async create(createScheduleDto: CreateScheduleDto) {
    // (day entity 연결 후) dayId가 존재하지 않으면 throw 에러

    // order 생성
    const newOrder = await this.getOrder(createScheduleDto.dayId);

    return await this.scheduleRepository.save({
      dayId: createScheduleDto.dayId,
      placeId: createScheduleDto.placeId,
      order: newOrder,
      transportation: createScheduleDto.transportation,
      memo: createScheduleDto.memo,
    });
  }

  // 리스트별 스케줄 전체 조회
  async findAllByDayId(dayId: number) {
    // (day entity 연결 후) dayId가 존재하지 않으면 throw 에러

    return await this.scheduleRepository.find({
      where: { dayId },
      order: { order: 'ASC' },
      select: { placeId: true, order: true }, // place table 연결 후 place title, category 함께 출력
    });
  }

  // 단일 스케줄 상세 조회
  async findOne(id: number) {
    return await this.scheduleRepository.findOne({ where: { id } });
    // place table 연결 후 place title, addr, mapX, mapY, category 함께 출력
  }

  // 스케줄 수정
  async update(id: number, updateScheduleDto: UpdateScheduleDto) {
    const updatedSchedule = await this.findOne(id);

    Object.assign(updatedSchedule, updateScheduleDto);
    return await this.scheduleRepository.save(updatedSchedule);
  }

  async move(id: number, moveScheduleDto: MoveScheduleDto) {
    const movedSchedule = await this.findOne(id);

    // 스케줄이 있는 day의 id와 입력받은 dayId가 일치하지 않는다면(스케줄을 다른 일차로 옮긴다면)
    if (moveScheduleDto.dayId && movedSchedule.dayId !== moveScheduleDto.dayId) {
      movedSchedule.dayId = moveScheduleDto.dayId;
    }

    let schedules = await this.findAllByDayId(movedSchedule.dayId);

    // 옮긴 day에 스케줄이 movedSchedule 하나라면 LexoRank 중앙값을 order에 저장 후 반환
    if (schedules.length === 1) {
      movedSchedule.order = LexoRank.middle().toString();
      return await this.scheduleRepository.save(movedSchedule);
    }

    // 이동할 곳에 lexorank를 지정할 공간이 부족하다면 reOrdering 함수 호출
    // 첫 스케줄 전, 마지막 스케줄 후, 이동할 스케줄 앞뒤 스케줄의 사이
    if (
      LexoRank.parse(schedules[0].order).genPrev() >= LexoRank.parse(schedules[0].order) ||
      LexoRank.parse(schedules[schedules.length - 1].order).genNext() <=
        LexoRank.parse(schedules[schedules.length - 1].order) ||
      LexoRank.parse(schedules[moveScheduleDto.index - 1].order).between(
        LexoRank.parse(schedules[moveScheduleDto.index].order),
      ) === LexoRank.parse(schedules[moveScheduleDto.index - 1].order) ||
      LexoRank.parse(schedules[moveScheduleDto.index - 1].order).between(
        LexoRank.parse(schedules[moveScheduleDto.index].order),
      ) === LexoRank.parse(schedules[moveScheduleDto.index].order)
    ) {
      schedules = await this.reOrdering(movedSchedule.dayId);
    }

    // order값 수정
    if (moveScheduleDto.index === 0) {
      movedSchedule.order = LexoRank.parse(schedules[0].order).genPrev().toString();
    } else if (moveScheduleDto.index === schedules.length - 1) {
      movedSchedule.order = LexoRank.parse(schedules[schedules.length - 1].order)
        .genNext()
        .toString();
    } else {
      const prevSchedule = LexoRank.parse(schedules[moveScheduleDto.index - 1].order);
      const nextSchedule = LexoRank.parse(schedules[moveScheduleDto.index].order);
      movedSchedule.order = prevSchedule.between(nextSchedule).toString();
    }

    // 수정된 order, dayId 변경하여 저장
    return await this.scheduleRepository.save(movedSchedule);
  }

  // order 재정렬
  async reOrdering(dayId: number) {
    const schedules = await this.findAllByDayId(dayId);

    let lexorank = LexoRank.middle();
    for (let i = 0; i < schedules.length; i++) {
      schedules[i].order = lexorank.toString();
      lexorank = lexorank.genNext();
    }

    return await this.scheduleRepository.save(schedules);
  }

  // 스케줄 삭제
  async remove(id: number) {
    return await this.scheduleRepository.delete({ id });
  }

  // 스케줄 생성 시 정렬 순서를 저장할 수 있게 order 값 지정
  async getOrder(dayId: number) {
    const schedules = await this.findAllByDayId(dayId);

    let order: string;

    // day가 비어있으면 lexorank 중앙값, 아니라면 가장 마지막 order의 다음값(genNext()) 지정
    if (!schedules.length) order = LexoRank.middle().toString();
    else {
      const lastOne = await this.scheduleRepository.findOne({
        where: { dayId },
        order: { order: 'DESC' },
      });

      order = LexoRank.parse(lastOne.order).genNext().toString();
    }

    return order;
  }
}
