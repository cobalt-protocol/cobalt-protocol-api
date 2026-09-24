import { PartialType } from '@nestjs/swagger';
import { CreateOrganizerCompetitionDto } from './create-organizer-competition.dto.js';

export class UpdateOrganizerCompetitionDto extends PartialType(
  CreateOrganizerCompetitionDto,
) {}
