import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PriceCompetitionService } from './price-competition.service.js';

describe('PriceCompetitionService', () => {
  let service: PriceCompetitionService;

  const mockPriceCompetition = {
    id: '01J8Z9X0000000000000000001',
    tx_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    price_competition_fee_id: 1n,
    treasury_fee: '50.000000000000000000',
    token_address: '0x1234567890123456789012345678901234567890',
    title: 'Standard Price Competition',
    description: 'Price competition tier standard',
    created_at: new Date('2026-09-23'),
    updated_at: null,
    deleted_at: null,
    competitions: [],
  };

  const mockPrismaService = {
    priceCompetition: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceCompetitionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PriceCompetitionService>(PriceCompetitionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return list of price competitions', async () => {
      mockPrismaService.priceCompetition.findMany.mockResolvedValue([mockPriceCompetition]);

      const result = await service.findAll();

      expect(mockPrismaService.priceCompetition.findMany).toHaveBeenCalledWith({
        where: { deleted_at: null },
        include: {
          competitions: {
            where: { deleted_at: null },
          },
        },
        orderBy: { created_at: 'desc' },
      });
      expect(result).toEqual({
        data: [mockPriceCompetition],
        message: 'Price competitions retrieved successfully',
        errors: null,
      });
    });

    it('should throw NotFoundException if no price competitions found', async () => {
      mockPrismaService.priceCompetition.findMany.mockResolvedValue([]);

      await expect(service.findAll()).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByFeeId', () => {
    it('should return price competition by price_competition_fee_id', async () => {
      mockPrismaService.priceCompetition.findFirst.mockResolvedValue(mockPriceCompetition);

      const result = await service.findByFeeId('1');

      expect(mockPrismaService.priceCompetition.findFirst).toHaveBeenCalledWith({
        where: {
          price_competition_fee_id: 1n,
          deleted_at: null,
        },
        include: {
          competitions: {
            where: { deleted_at: null },
          },
        },
      });
      expect(result).toEqual({
        data: mockPriceCompetition,
        message: 'Price competition retrieved successfully',
        errors: null,
      });
    });

    it('should throw NotFoundException if fee ID is invalid non-numeric string', async () => {
      await expect(service.findByFeeId('invalid')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if price competition with fee ID is not found', async () => {
      mockPrismaService.priceCompetition.findFirst.mockResolvedValue(null);

      await expect(service.findByFeeId('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return price competition by ULID', async () => {
      mockPrismaService.priceCompetition.findFirst.mockResolvedValue(mockPriceCompetition);

      const result = await service.findOne('01J8Z9X0000000000000000001');

      expect(mockPrismaService.priceCompetition.findFirst).toHaveBeenCalledWith({
        where: {
          id: '01J8Z9X0000000000000000001',
          deleted_at: null,
        },
        include: {
          competitions: {
            where: { deleted_at: null },
          },
        },
      });
      expect(result).toEqual({
        data: mockPriceCompetition,
        message: 'Price competition retrieved successfully',
        errors: null,
      });
    });

    it('should return price competition by numeric fee ID', async () => {
      mockPrismaService.priceCompetition.findFirst.mockResolvedValue(mockPriceCompetition);

      const result = await service.findOne('1');

      expect(mockPrismaService.priceCompetition.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: '1' }, { price_competition_fee_id: 1n }],
          deleted_at: null,
        },
        include: {
          competitions: {
            where: { deleted_at: null },
          },
        },
      });
      expect(result).toEqual({
        data: mockPriceCompetition,
        message: 'Price competition retrieved successfully',
        errors: null,
      });
    });

    it('should throw NotFoundException if price competition not found', async () => {
      mockPrismaService.priceCompetition.findFirst.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
