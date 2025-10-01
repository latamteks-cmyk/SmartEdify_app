import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { MembershipService } from "./membership.service";
import {
  UserMembership,
  MembershipStatus,
} from "../entities/user-membership.entity";
import { UserProfile } from "../entities/user-profile.entity";
import { CacheService } from "../../cache/cache.service";

describe("MembershipService", () => {
  let service: MembershipService;
  let membershipRepository: Repository<UserMembership>;
  let profileRepository: Repository<UserProfile>;
  let cacheService: CacheService;
  let eventEmitter: EventEmitter2;

  const mockMembershipRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockProfileRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockCacheService = {
    invalidateUserMemberships: jest.fn(),
    getUserMemberships: jest.fn(),
    cacheUserMemberships: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipService,
        {
          provide: getRepositoryToken(UserMembership),
          useValue: mockMembershipRepository,
        },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: mockProfileRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<MembershipService>(MembershipService);
    membershipRepository = module.get<Repository<UserMembership>>(
      getRepositoryToken(UserMembership)
    );
    profileRepository = module.get<Repository<UserProfile>>(
      getRepositoryToken(UserProfile)
    );
    cacheService = module.get<CacheService>(CacheService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createMembership", () => {
    it("should create a new membership successfully", async () => {
      const tenantId = "tenant-1";
      const profileId = "profile-1";
      const membershipData = {
        tenantId,
        profileId,
        condominiumId: "condo-1",
        unitId: "unit-1",
        membershipType: "OWNER" as any,
        votingRights: true,
      };

      const mockProfile = { id: profileId, tenantId, userId: "user-1" };
      const mockMembership = { id: "membership-1", ...membershipData };

      mockProfileRepository.findOne.mockResolvedValue(mockProfile);
      mockMembershipRepository.findOne.mockResolvedValue(null); // No existing membership
      mockMembershipRepository.create.mockReturnValue(mockMembership);
      mockMembershipRepository.save.mockResolvedValue(mockMembership);

      const result = await service.createMembership(membershipData);

      expect(mockProfileRepository.findOne).toHaveBeenCalledWith({
        where: { id: profileId, tenantId },
      });
      expect(mockMembershipRepository.create).toHaveBeenCalledWith(
        membershipData
      );
      expect(mockMembershipRepository.save).toHaveBeenCalledWith(
        mockMembership
      );
      expect(mockCacheService.invalidateUserMemberships).toHaveBeenCalledWith(
        tenantId,
        "user-1"
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "membership.created",
        expect.any(Object)
      );
      expect(result).toEqual(mockMembership);
    });

    it("should throw NotFoundException when profile does not exist", async () => {
      const membershipData = {
        tenantId: "tenant-1",
        profileId: "non-existent-profile",
        condominiumId: "condo-1",
        membershipType: "OWNER" as any,
      };

      mockProfileRepository.findOne.mockResolvedValue(null);

      await expect(service.createMembership(membershipData)).rejects.toThrow(
        "Profile not found"
      );
    });

    it("should throw BadRequestException when active membership already exists", async () => {
      const membershipData = {
        tenantId: "tenant-1",
        profileId: "profile-1",
        condominiumId: "condo-1",
        unitId: "unit-1",
        membershipType: "OWNER" as any,
      };

      const mockProfile = {
        id: "profile-1",
        tenantId: "tenant-1",
        userId: "user-1",
      };
      const existingMembership = {
        id: "existing-1",
        status: MembershipStatus.ACTIVE,
      };

      mockProfileRepository.findOne.mockResolvedValue(mockProfile);
      mockMembershipRepository.findOne.mockResolvedValue(existingMembership);

      await expect(service.createMembership(membershipData)).rejects.toThrow(
        "Active membership already exists for this profile and unit"
      );
    });
  });

  describe("getUserMemberships", () => {
    it("should return cached memberships if available", async () => {
      const tenantId = "tenant-1";
      const userId = "user-1";
      const cachedMemberships = [{ id: "membership-1" }];

      mockCacheService.getUserMemberships.mockResolvedValue(cachedMemberships);

      const result = await service.getUserMemberships(tenantId, userId);

      expect(mockCacheService.getUserMemberships).toHaveBeenCalledWith(
        tenantId,
        userId
      );
      expect(result).toEqual(cachedMemberships);
      expect(mockProfileRepository.findOne).not.toHaveBeenCalled();
    });

    it("should fetch from database and cache when not in cache", async () => {
      const tenantId = "tenant-1";
      const userId = "user-1";
      const profileId = "profile-1";
      const memberships = [{ id: "membership-1" }];

      mockCacheService.getUserMemberships.mockResolvedValue(null);
      mockProfileRepository.findOne.mockResolvedValue({
        id: profileId,
        tenantId,
        userId,
      });
      mockMembershipRepository.find.mockResolvedValue(memberships);

      const result = await service.getUserMemberships(tenantId, userId);

      expect(mockProfileRepository.findOne).toHaveBeenCalledWith({
        where: { tenantId, userId },
      });
      expect(mockMembershipRepository.find).toHaveBeenCalledWith({
        where: { tenantId, profileId },
        order: { createdAt: "DESC" },
      });
      expect(mockCacheService.cacheUserMemberships).toHaveBeenCalledWith(
        tenantId,
        userId,
        memberships
      );
      expect(result).toEqual(memberships);
    });

    it("should return empty array when profile does not exist", async () => {
      const tenantId = "tenant-1";
      const userId = "user-1";

      mockCacheService.getUserMemberships.mockResolvedValue(null);
      mockProfileRepository.findOne.mockResolvedValue(null);

      const result = await service.getUserMemberships(tenantId, userId);

      expect(result).toEqual([]);
    });
  });

  describe("validateQuorumEligibility", () => {
    it("should validate quorum eligibility correctly", async () => {
      const tenantId = "tenant-1";
      const condominiumId = "condo-1";
      const userIds = ["user-1", "user-2"];

      const profiles = [
        { id: "profile-1", userId: "user-1" },
        { id: "profile-2", userId: "user-2" },
      ];

      const memberships = [
        {
          id: "membership-1",
          profileId: "profile-1",
          ownershipPercentage: 30,
          membershipType: "OWNER",
          profile: profiles[0],
        },
        {
          id: "membership-2",
          profileId: "profile-2",
          ownershipPercentage: 25,
          membershipType: "OWNER",
          profile: profiles[1],
        },
      ];

      mockProfileRepository.find.mockResolvedValue(profiles);
      mockMembershipRepository.find.mockResolvedValue(memberships);

      const result = await service.validateQuorumEligibility(
        tenantId,
        condominiumId,
        userIds
      );

      expect(result.eligible).toBe(true); // 55% > 50%
      expect(result.totalPercentage).toBe(55);
      expect(result.details).toHaveLength(2);
    });

    it("should return not eligible when percentage is below threshold", async () => {
      const tenantId = "tenant-1";
      const condominiumId = "condo-1";
      const userIds = ["user-1"];

      const profiles = [{ id: "profile-1", userId: "user-1" }];
      const memberships = [
        {
          id: "membership-1",
          profileId: "profile-1",
          ownershipPercentage: 40,
          membershipType: "OWNER",
          profile: profiles[0],
        },
      ];

      mockProfileRepository.find.mockResolvedValue(profiles);
      mockMembershipRepository.find.mockResolvedValue(memberships);

      const result = await service.validateQuorumEligibility(
        tenantId,
        condominiumId,
        userIds
      );

      expect(result.eligible).toBe(false); // 40% < 50%
      expect(result.totalPercentage).toBe(40);
    });
  });
});
