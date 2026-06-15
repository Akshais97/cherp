const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany({
  select: {
    email: true,
    role: { select: { name: true } },
    is_active: true
  }
}).then(users => {
  console.log('Users:', users);
}).catch(err => {
  console.error(err);
}).finally(() => {
  prisma.$disconnect();
});
