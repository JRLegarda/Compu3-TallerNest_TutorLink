import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { Review } from './entities/review.entity.js';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Booking } from '../booking/entities/booking.entity.js';
import { User } from '../user/entities/user.entity.js';
import { CreateReview } from './dto/create-review.js';
import { BookingStatus } from '../booking/enums/booking-status.enum.js';

@Injectable()
export class ReviewService {

    private readonly logger = new Logger('ReviewService');

    constructor(
        @InjectRepository(Review)
        private readonly reviewRepository : Repository<Review>,
        @InjectRepository(Booking)
        private readonly bookingRepository : Repository<Booking>,

    ){}

    async create(student : User , createReviewDto : CreateReview) {
        const booking = await this.bookingRepository.findOne({
            where : { id : createReviewDto.bookingId },
            relations : { student : true , tutorProfile : true}
        });

        if(!booking){
            throw new NotFoundException(`Booking with id ${createReviewDto.bookingId} not found`);
        }
        if (booking.student.id !== student.id) {
        throw new ForbiddenException('You can only review your own bookings');
        }
        if (booking.status !== BookingStatus.COMPLETED) {
        throw new BadRequestException('Only COMPLETED bookings can be reviewed');
        }

        const existing = await this.reviewRepository.findOne({
            where: { booking : {id: booking.id}}, 
        })

        if (existing){
            throw new ConflictException('This booking already has a review');
        }

        try{
            const review = this.reviewRepository.create({
                rating: createReviewDto.rating,
                comment: createReviewDto.comment.trim(),
                booking,
                student,
                tutorProfile : booking.tutorProfile,
            });

            return await this.reviewRepository.save(review);

        }catch(error){
            this.handleException(error);
        }

    }

    async findByTutor(tutorProfileId : string) {
        const [ reviews , average] = await Promise.all([
            this.reviewRepository.find({
                where: { tutorProfile : { id: tutorProfileId }},
                order : { createdAt : 'DESC'},
            }),
            this.reviewRepository
            .createQueryBuilder('review')
            .innerJoin('review.tutorProfile', 'tp')
            .where('tp.id = : tutorProfileId', { tutorProfileId })
            .select('AVG(review.rating)', 'avg')
            .getRawOne<{ avg : string | null }>(),
        ]);

        return {
            average: average?.avg ? Number(average.avg) : 0,
            count: reviews.length,
            reviews,
        };
    }

    private handleException(error: any): never {
        if (error.code === '23505') throw new ConflictException(error.detail);
        this.logger.error(error);
        throw new InternalServerErrorException('Unexpected error, check server logs');
    }
}
