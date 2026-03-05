import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateProductStatsDto {
    @IsOptional()
    @IsNumber()
    @Min(0)
    sales?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    rating?: number;
}
