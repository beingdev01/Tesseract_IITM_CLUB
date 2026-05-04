import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const user1 = await prisma.user.upsert({
        where: { email: 'test1@ds.study.iitm.ac.in' },
        update: {},
        create: {
            name: 'Test Member One',
            email: 'test1@ds.study.iitm.ac.in',
            role: 'USER',
            bio: 'This is my short bio from the user profile side.',
            githubUrl: 'https://github.com/test1',
            linkedinUrl: 'https://linkedin.com/in/test1',
            profileCompleted: true,
            course: 'BS',
            branch: 'Data Science',
            level: 'BS',
            year: '2024',
            oauthProvider: 'dev',
            oauthId: 'dev-test1',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TestMemberOne',
        },
    });
    const user2 = await prisma.user.upsert({
        where: { email: 'test2@es.study.iitm.ac.in' },
        update: {},
        create: {
            name: 'Test Member Two',
            email: 'test2@es.study.iitm.ac.in',
            role: 'USER',
            bio: 'Another bio from a different user.',
            twitterUrl: 'https://twitter.com/test2',
            profileCompleted: true,
            course: 'BS',
            branch: 'Electronic Systems',
            level: 'DIPLOMA',
            year: '2025',
            oauthProvider: 'dev',
            oauthId: 'dev-test2',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TestMemberTwo',
        },
    });
    console.info('Created test users successfully. They sign in via the dev-login route.');
    console.info('User 1:', { email: user1.email, id: user1.id });
    console.info('User 2:', { email: user2.email, id: user2.id });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
