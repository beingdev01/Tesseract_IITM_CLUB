import { MembersService } from "../src/members/members.service";

describe("MembersService.directory", () => {
  it("rejects invalid role filters", async () => {
    const prisma = {
      user: { findMany: jest.fn(), count: jest.fn() },
      membershipRequest: { findFirst: jest.fn() }
    };
    const users = { publicUser: jest.fn() };
    const activity = { log: jest.fn() };
    const service = new MembersService(prisma as never, users as never, activity as never);

    await expect(service.directory({ id: "admin-1", role: "admin" }, { role: "guest" })).rejects.toMatchObject({
      code: "invalid_query"
    });
  });

  it("returns paginated roster for admin viewers", async () => {
    const rows = [{ id: "u2", role: "core", joinedAt: new Date(), xp: 0 }];
    const prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue(rows),
        count: jest.fn().mockResolvedValue(1)
      },
      membershipRequest: { findFirst: jest.fn() }
    };
    const users = {
      publicUser: jest.fn().mockImplementation(async (user: { id: string; role: string }) => ({
        id: user.id,
        role: user.role
      }))
    };
    const activity = { log: jest.fn() };
    const service = new MembersService(prisma as never, users as never, activity as never);

    const result = await service.directory({ id: "admin-1", role: "admin" }, { role: "core", page: "1", page_size: "10" });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: "core" })
      })
    );
    expect(result.data).toEqual([
      { id: "u2", role: "core" }
    ]);
    expect(result.meta).toEqual({ page: 1, pageSize: 10, total: 1, pages: 1 });
  });
});
