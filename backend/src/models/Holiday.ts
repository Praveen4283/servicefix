import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BusinessHours } from './BusinessHours';

@Entity('holidays')
export class Holiday {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  name: string;

  @Column({ type: 'date', nullable: false })
  date: Date;

  @Column({ name: 'business_hours_id', nullable: false })
  businessHoursId: number;

  @ManyToOne(() => BusinessHours, businessHours => businessHours.holidays)
  @JoinColumn({ name: 'business_hours_id' })
  businessHours: BusinessHours;

  @Column({ default: false })
  recurring: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 