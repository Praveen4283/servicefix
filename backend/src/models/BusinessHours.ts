import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Organization } from './Organization';
import { Holiday } from './Holiday';

@Entity('business_hours')
export class BusinessHours {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'organization_id', nullable: false })
  organizationId: number;

  @ManyToOne(() => Organization, organization => organization.businessHours)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'monday_start', type: 'varchar', length: 5, nullable: true })
  mondayStart: string;

  @Column({ name: 'monday_end', type: 'varchar', length: 5, nullable: true })
  mondayEnd: string;

  @Column({ name: 'tuesday_start', type: 'varchar', length: 5, nullable: true })
  tuesdayStart: string;

  @Column({ name: 'tuesday_end', type: 'varchar', length: 5, nullable: true })
  tuesdayEnd: string;

  @Column({ name: 'wednesday_start', type: 'varchar', length: 5, nullable: true })
  wednesdayStart: string;

  @Column({ name: 'wednesday_end', type: 'varchar', length: 5, nullable: true })
  wednesdayEnd: string;

  @Column({ name: 'thursday_start', type: 'varchar', length: 5, nullable: true })
  thursdayStart: string;

  @Column({ name: 'thursday_end', type: 'varchar', length: 5, nullable: true })
  thursdayEnd: string;

  @Column({ name: 'friday_start', type: 'varchar', length: 5, nullable: true })
  fridayStart: string;

  @Column({ name: 'friday_end', type: 'varchar', length: 5, nullable: true })
  fridayEnd: string;

  @Column({ name: 'saturday_start', type: 'varchar', length: 5, nullable: true })
  saturdayStart: string;

  @Column({ name: 'saturday_end', type: 'varchar', length: 5, nullable: true })
  saturdayEnd: string;

  @Column({ name: 'sunday_start', type: 'varchar', length: 5, nullable: true })
  sundayStart: string;

  @Column({ name: 'sunday_end', type: 'varchar', length: 5, nullable: true })
  sundayEnd: string;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ type: 'varchar', length: 50, default: 'UTC' })
  timezone: string;

  @OneToMany(() => Holiday, holiday => holiday.businessHours)
  holidays: Holiday[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 