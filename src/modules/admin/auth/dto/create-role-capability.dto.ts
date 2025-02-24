import { IsNotEmpty, IsString, IsArray, ArrayNotEmpty, IsNumber } from "class-validator";

export class CreateRoleCapabilityDto {
    @IsString()
    @IsNotEmpty()
    role: string;

    @IsString()
    @IsNotEmpty()
    user: any;

    @IsArray()
    @ArrayNotEmpty()
    @IsNumber({}, { each: true }) // Ensures all elements are numbers
    permissions: number[];
}
