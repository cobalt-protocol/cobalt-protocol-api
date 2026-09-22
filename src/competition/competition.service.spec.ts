import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { CompetitionService } from './competition.service.js';

describe('CompetitionService', () => {
  let service: CompetitionService;

  const mockCompetition = {
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
  };

  const mockPrismaService = {
    competition: {
      findMany: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompetitionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CompetitionService>(CompetitionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all competitions', async () => {
      mockPrismaService.competition.findMany.mockResolvedValue([mockCompetition]);

      const result = await service.findAll();

      expect(mockPrismaService.competition.findMany).toHaveBeenCalledWith({
        where: { deleted_at: null },
        include: {
          prize_winners: {
            where: { deleted_at: null },
          },
        },
        orderBy: { created_at: 'desc' },
      });
      expect(result).toEqual({
        data: [mockCompetition],
        message: 'Competitions retrieved successfully',
        errors: null,
      });
    });
  });
});
