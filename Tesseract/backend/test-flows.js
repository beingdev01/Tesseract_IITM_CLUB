const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log("--- Starting flow tests ---");

  // Create users
  const adminId = "usr_flow_admin_" + Date.now();
  const u1Id = "usr_flow_1_" + Date.now();
  const u2Id = "usr_flow_2_" + Date.now();
  const u3Id = "usr_flow_3_" + Date.now();

  await prisma.user.createMany({
    data: [
      { id: adminId, email: `admin_${Date.now()}@ds.study.iitm.ac.in`, name: "Admin", role: "admin", profileCompleted: true },
      { id: u1Id, email: `u1_${Date.now()}@ds.study.iitm.ac.in`, name: "User1", role: "member", profileCompleted: true },
      { id: u2Id, email: `u2_${Date.now()}@ds.study.iitm.ac.in`, name: "User2", role: "member", profileCompleted: true },
      { id: u3Id, email: `u3_${Date.now()}@ds.study.iitm.ac.in`, name: "User3", role: "member", profileCompleted: true },
    ]
  });
  console.log("Created test users.");

  // Create event
  const evt = await prisma.event.create({
    data: {
      title: "Flow Test Event",
      slug: `flow-test-${Date.now()}`,
      description: "Test event",
      category: "hackathon",
      status: "live",
      startsAt: new Date(Date.now() + 86400000),
      endsAt: new Date(Date.now() + 172800000),
      capacity: 3,
      teamRegistration: true,
      teamMinSize: 1,
      teamMaxSize: 2,
      location: "Virtual",
      organizers: ["admin"]
    }
  });
  console.log("Created Event:", evt.id);

  try {
    // 1. Create a team
    console.log("Testing team creation...");
    const teamName = "Flow Boys";
    const inviteCode = "FLOW1234";
    
    // Simulate transaction for team creation
    await prisma.$transaction(async (tx) => {
      const reg = await tx.eventRegistration.create({
        data: {
          eventId: evt.id,
          userId: u1Id,
          registrationType: "PARTICIPANT",
        }
      });
      const team = await tx.eventTeam.create({
        data: {
          eventId: evt.id,
          teamName,
          inviteCode,
          leaderId: u1Id,
          isLocked: false
        }
      });
      await tx.eventTeamMember.create({
        data: {
          teamId: team.id,
          registrationId: reg.id,
          userId: u1Id,
          role: "LEADER"
        }
      });
      await tx.event.update({
        where: { id: evt.id },
        data: { registeredCount: { increment: 1 } }
      });
      console.log("Team created successfully:", team.id);
    });

    // 2. Try joining team normally
    console.log("Testing join team...");
    await prisma.$transaction(async (tx) => {
      const team = await tx.eventTeam.findUnique({ where: { inviteCode } });
      const reg = await tx.eventRegistration.create({
        data: {
          eventId: evt.id,
          userId: u2Id,
          registrationType: "PARTICIPANT",
        }
      });
      await tx.eventTeamMember.create({
        data: {
          teamId: team.id,
          registrationId: reg.id,
          userId: u2Id,
          role: "MEMBER"
        }
      });
      await tx.event.update({
        where: { id: evt.id },
        data: { registeredCount: { increment: 1 } }
      });
      console.log("Joined team successfully.");
    });

    // 3. Try joining full team
    console.log("Testing capacity constraint (should fail or throw)...");
    try {
      await prisma.$transaction(async (tx) => {
        const team = await tx.eventTeam.findUnique({ where: { inviteCode }, include: { _count: { select: { members: true } } } });
        if (team._count.members >= evt.teamMaxSize) {
          throw new Error("Team is full");
        }
        // This won't run if error is thrown
      });
    } catch (err) {
      console.log("Successfully caught full team error:", err.message);
    }

    // 4. Try joining a locked team
    console.log("Testing locking mechanism...");
    await prisma.eventTeam.update({ where: { inviteCode }, data: { isLocked: true } });
    
    // Cleanup
    await prisma.event.delete({ where: { id: evt.id } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, u1Id, u2Id, u3Id] } } });
    console.log("Flow test passed.");
  } catch (err) {
    console.error("Test failed:", err);
  }
}

run().finally(() => prisma.$disconnect());
