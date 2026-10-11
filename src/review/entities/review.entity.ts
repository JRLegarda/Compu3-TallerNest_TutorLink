import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Booking } from "../../booking/entities/booking.entity.js";
import { User } from "../../user/entities/user.entity.js";
import { TutorProfile } from "../../tutor/entities/tutor-profile.entity.js";
import { ApiProperty } from "@nestjs/swagger";

@Entity('review')
export class Review {

    @ApiProperty({ example: '4fcfc5ab-7902-478f-b173-b8f1e751af12', format: 'uuid' })
    @PrimaryGeneratedColumn('uuid')
    id : string;

    @ApiProperty({ example: 5, description: 'Rating from 1 to 5', minimum: 1, maximum: 5 })
    @Column('int')
    rating : number;

    @ApiProperty({ example: 'Explica muy claro y es puntual.' })
    @Column('text')
    comment : string;

    //Una reseña por cada reserva
    
    @OneToOne(() => Booking, { onDelete: 'CASCADE'})
    @JoinColumn()
    booking : Booking;

    //Un estudiante hace muchas reseñas
    @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
    student : User;

    //Un tutor tiene muchas reseñas asociadas
    @ManyToOne(() => TutorProfile, { onDelete: 'CASCADE', eager: true})
    tutorProfile : TutorProfile;

    @ApiProperty({ example: '2026-10-21T10:00:00.000Z' })
    @CreateDateColumn()
    createdAt : Date;



}
