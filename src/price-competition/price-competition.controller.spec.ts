import { Test, TestingModule } from '@nestjs/testing';
import { PriceCompetitionController } from './price-competition.controller.js';
import { PriceCompetitionService } from './price-competition.service.js';

describe('PriceCompetitionController', () => {
  let controller: PriceCompetitionController;

  const mockResponse = {
    data: [
      {
        id: '01J8Z9X0000000000000000001',
        title: 'Standard Price Competition',
      },
    ],
    message: 'Price competitions retrieved successfully',
    errors: null,
  };

  const mockPriceCompetitionService = {
    findAll: vi.fn(),
    findByFeeId: vi.fn(),
    findOne: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PriceCompetitionController],
      providers: [
        {
          provide: PriceCompetitionService,
          useValue: mockPriceCompetitionService,
        },
      ],
    }).compile();

    controller = module.get<PriceCompetitionController>(PriceCompetitionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return list of price competitions', async () => {
      mockPriceCompetitionService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll();

      expect(mockPriceCompetitionService.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });
  });

  describe('findByFeeId', () => {
    it('should return price competition by fee id', async () => {
      const mockSingle = {
        data: mockResponse.data[0],
        message: 'Price competition retrieved successfully',
        errors: null,
      };
      mockPriceCompetitionService.findByFeeId.mockResolvedValue(mockSingle);

      const result = await controller.findByFeeId('1');

      expect(mockPriceCompetitionService.findByFeeId).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockSingle);
    });
  });

  describe('findOne', () => {
    it('should return price competition by id', async () => {
      const mockSingle = {
        data: mockResponse.data[0],
        message: 'Price competition retrieved successfully',
        errors: null,
      };
      mockPriceCompetitionService.findOne.mockResolvedValue(mockSingle);

      const result = await controller.findOne('01J8Z9X0000000000000000001');

      expect(mockPriceCompetitionService.findOne).toHaveBeenCalledWith(
        '01J8Z9X0000000000000000001',
      );
      expect(result).toEqual(mockSingle);
    });
  });
});
