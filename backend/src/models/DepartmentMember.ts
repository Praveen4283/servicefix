import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { Department } from './Department';
import { User } from './User';

@Entity('department_members')
export class DepartmentMember {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ManyToOne(() => Department, department => department.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'department_id', type: 'bigint' })
  departmentId: number;

  @OneToOne(() => User, user => user.departmentMember, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @Column({ name: 'is_manager', default: false })
  isManager: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
} 