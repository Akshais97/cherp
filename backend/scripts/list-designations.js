const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany({
  where: {
    designation: {
      not: null
    }
  },
  select: {
    email: true,
    full_name: true,
    designation: true,
    role: { select: { name: true } }
  }
}).then(users => {
  console.log('Users with designations:', users);
}).catch(err => {
  console.error(err);
}).finally(() => {
  prisma.$disconnect();
});
