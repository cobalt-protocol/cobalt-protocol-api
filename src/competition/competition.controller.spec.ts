import { Test, TestingModule } from '@nestjs/testing';
import { CompetitionController } from './competition.controller.js';
import { CompetitionService } from './competition.service.js';

describe('CompetitionController', () => {
  let controller: CompetitionController;

  const mockCompetitionResponse = {
    data: [
      {
        id: '01J8Z9X0000000000000000001',
        tx_hash: '0x1234567890abcdef',
        name: 'Cobalt Hackathon 2026',
        category: 'Web3',
        description: 'Hackathon description',
        requirement: 'Requirements',
        registration_window: new Date('2026-10-01'),
        competition_window: new Date('2026-10-15'),
        submission_deadline: new Date('2026-11-01'),
        judging_review: new Date('2026-11-05'),
        result_announcement: new Date('2026-11-10'),
        pirze_certificate_claim: new Date('2026-11-15'),
        certificate_cid: 'Qm123',
        guidebook_cid: 'Qm456',
        created_at: new Date('2026-09-23'),
        updated_at: null,
        deleted_at: null,
        prize_winners: [],
      },
    ],
    message: 'Competitions retrieved successfully',
    errors: null,
  };

  const mockCompetitionService = {
    findAll: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompetitionController],
      providers: [
        { provide: CompetitionService, useValue: mockCompetitionService },
      ],
    }).compile();

    controller = module.get<CompetitionController>(CompetitionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return list of competitions', async () => {
      mockCompetitionService.findAll.mockResolvedValue(mockCompetitionResponse);

      const result = await controller.findAll();

      expect(mockCompetitionService.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockCompetitionResponse);
    });
  });
});
