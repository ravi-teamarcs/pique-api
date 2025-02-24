import { IsArray, IsEnum, IsInt, IsNotEmpty } from 'class-validator';
import { Column } from 'typeorm';

export class UpdateStatusDto {
    @IsArray()
    @IsInt({ each: true })
    @IsNotEmpty()
    id: number;

    @Column({
        type: 'enum',
        enum: ['active', 'inactive', 'pending'],
        default: 'pending',
    })
    status: 'active' | 'inactive' | 'pending';
}
