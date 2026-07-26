import prisma from "../lib/prisma.js";

async function main() {
  const user = await prisma.user.create({
    data: {
      email: "test@sellsync.com",
      name: "Test Owner",
      role: "OWNER",
      password: "benny1627"
    }
  });

  console.log("User created:", user);
}

main()
  .catch((err) => {
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });