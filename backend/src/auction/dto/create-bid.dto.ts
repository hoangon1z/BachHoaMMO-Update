import { IsNumber, IsInt, Min, Max } from 'class-validator';

export class CreateBidDto {
  @IsInt()
  @Min(1)
  @Max(3)
  position: number;

  @IsNumber()
  @Min(0)
  amount: number;
}
